"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  enabled: boolean
  /** Width-to-height aspect ratio of the guide frame. Defaults to 1.6 (ID card). Use 0.714 for passport. */
  aspectRatio?: number
}

const ANALYSIS_WIDTH = 320
const ANALYSIS_HEIGHT = 200
const TARGET_FPS = 15
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS
const STABILITY_MS = 400

// Sobel kernels
const KX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
const KY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

function sobelEdgeStrength(pixels: Uint8ClampedArray, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0, gy = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4
          const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114
          const ki = (ky + 1) * 3 + (kx + 1)
          gx += gray * KX[ki]
          gy += gray * KY[ki]
        }
      }
      out[y * w + x] = Math.sqrt(gx * gx + gy * gy)
    }
  }
  return out
}

function checkDocument(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  aspectRatio: number
): boolean {
  const edges = sobelEdgeStrength(pixels, w, h)
  const threshold = 45

  // Guide zone matches the on-screen overlay
  const isPortrait = aspectRatio < 1
  const gw = isPortrait ? Math.round(Math.min(w, h) * 0.75 * aspectRatio) : Math.round(w * 0.85)
  const gh = Math.round(gw / aspectRatio)
  const gx = Math.round((w - gw) / 2)
  const gy = Math.round((h - gh) / 2)

  // Outer perimeter band — where the document edge SHOULD be (0-12% inward from guide border)
  const outerBandV = Math.max(3, Math.round(gh * 0.12))
  const outerBandH = Math.max(3, Math.round(gw * 0.12))

  // Inner "no-edge" band — if the document is smaller and centered, its edges will fall here.
  // This zone runs from 18-35% inward. We require edge density here to be LOW.
  const innerStartV = Math.round(gh * 0.18)
  const innerEndV   = Math.round(gh * 0.35)
  const innerStartH = Math.round(gw * 0.18)
  const innerEndH   = Math.round(gw * 0.35)

  let outerTop = 0, outerBottom = 0, outerLeft = 0, outerRight = 0
  let outerTopTotal = 0, outerBottomTotal = 0, outerLeftTotal = 0, outerRightTotal = 0

  let innerTopRing = 0, innerBottomRing = 0, innerLeftRing = 0, innerRightRing = 0
  let innerTopTotal = 0, innerBottomTotal = 0, innerLeftTotal = 0, innerRightTotal = 0

  for (let py = gy; py < gy + gh; py++) {
    for (let px = gx; px < gx + gw; px++) {
      const e = edges[py * w + px]
      const strong = e > threshold

      const dyFromTop    = py - gy
      const dyFromBottom = (gy + gh - 1) - py
      const dxFromLeft   = px - gx
      const dxFromRight  = (gx + gw - 1) - px

      // Outer perimeter bands
      if (dyFromTop < outerBandV)    { outerTopTotal++;    if (strong) outerTop++ }
      if (dyFromBottom < outerBandV) { outerBottomTotal++; if (strong) outerBottom++ }
      if (dxFromLeft < outerBandH)   { outerLeftTotal++;   if (strong) outerLeft++ }
      if (dxFromRight < outerBandH)  { outerRightTotal++;  if (strong) outerRight++ }

      // Inner anti-bands (where small/floating docs would show their edges)
      if (dyFromTop    >= innerStartV && dyFromTop    < innerEndV) { innerTopTotal++;    if (strong) innerTopRing++ }
      if (dyFromBottom >= innerStartV && dyFromBottom < innerEndV) { innerBottomTotal++; if (strong) innerBottomRing++ }
      if (dxFromLeft   >= innerStartH && dxFromLeft   < innerEndH) { innerLeftTotal++;   if (strong) innerLeftRing++ }
      if (dxFromRight  >= innerStartH && dxFromRight  < innerEndH) { innerRightTotal++;  if (strong) innerRightRing++ }
    }
  }

  const outerTopD    = outerTopTotal    > 0 ? outerTop    / outerTopTotal    : 0
  const outerBottomD = outerBottomTotal > 0 ? outerBottom / outerBottomTotal : 0
  const outerLeftD   = outerLeftTotal   > 0 ? outerLeft   / outerLeftTotal   : 0
  const outerRightD  = outerRightTotal  > 0 ? outerRight  / outerRightTotal  : 0

  const innerTopD    = innerTopTotal    > 0 ? innerTopRing    / innerTopTotal    : 0
  const innerBottomD = innerBottomTotal > 0 ? innerBottomRing / innerBottomTotal : 0
  const innerLeftD   = innerLeftTotal   > 0 ? innerLeftRing   / innerLeftTotal   : 0
  const innerRightD  = innerRightTotal  > 0 ? innerRightRing  / innerRightTotal  : 0

  // Document near guide border: strong outer edges AND outer must be denser than inner
  // (outer > 2× inner means most strong edges sit at the perimeter, not inside)
  const sideOk = (outer: number, inner: number) => outer > 0.06 && outer > inner * 1.8

  const edgesOk = (
    sideOk(outerTopD,    innerTopD)    &&
    sideOk(outerBottomD, innerBottomD) &&
    sideOk(outerLeftD,   innerLeftD)   &&
    sideOk(outerRightD,  innerRightD)
  )

  // Sharpness: variance in the center 50% of the guide
  const cx1 = gx + Math.round(gw * 0.25)
  const cx2 = gx + Math.round(gw * 0.75)
  const cy1 = gy + Math.round(gh * 0.25)
  const cy2 = gy + Math.round(gh * 0.75)
  let sum = 0, sumSq = 0, count = 0
  for (let py = cy1; py < cy2; py++) {
    for (let px = cx1; px < cx2; px++) {
      const idx = (py * w + px) * 4
      const lum = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114
      sum += lum
      sumSq += lum * lum
      count++
    }
  }
  const mean = sum / count
  const variance = sumSq / count - mean * mean
  const sharpnessOk = variance > 80

  return edgesOk && sharpnessOk
}

export function useDocumentDetection({ videoRef, enabled, aspectRatio = 1.6 }: UseDocumentDetectionOptions) {
  const [isDocumentDetected, setIsDocumentDetected] = useState(false)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)
  const detectedSinceRef = useRef<number | null>(null)
  const stableDetectedRef = useRef(false)

  const getOffscreen = useCallback(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement("canvas")
      offscreenRef.current.width = ANALYSIS_WIDTH
      offscreenRef.current.height = ANALYSIS_HEIGHT
    }
    return offscreenRef.current
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      detectedSinceRef.current = null
      stableDetectedRef.current = false
      setIsDocumentDetected(false)
      return
    }

    let active = true

    const analyze = (timestamp: number) => {
      if (!active) return

      if (timestamp - lastFrameTimeRef.current >= FRAME_INTERVAL_MS) {
        lastFrameTimeRef.current = timestamp
        const video = videoRef.current
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          try {
            const canvas = getOffscreen()
            const ctx = canvas.getContext("2d", { willReadFrequently: true })
            if (ctx) {
              ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
              const imageData = ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
              const detected = checkDocument(imageData.data, ANALYSIS_WIDTH, ANALYSIS_HEIGHT, aspectRatio)

              if (detected) {
                if (detectedSinceRef.current === null) {
                  detectedSinceRef.current = timestamp
                }
                const heldMs = timestamp - detectedSinceRef.current
                if (heldMs >= STABILITY_MS && !stableDetectedRef.current) {
                  stableDetectedRef.current = true
                  setIsDocumentDetected(true)
                }
              } else {
                detectedSinceRef.current = null
                if (stableDetectedRef.current) {
                  stableDetectedRef.current = false
                  setIsDocumentDetected(false)
                }
              }
            }
          } catch {
            // Ignore cross-origin or tainted canvas errors
          }
        }
      }

      rafRef.current = requestAnimationFrame(analyze)
    }

    rafRef.current = requestAnimationFrame(analyze)

    return () => {
      active = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, videoRef, getOffscreen])

  return { isDocumentDetected }
}
