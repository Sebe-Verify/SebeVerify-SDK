"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  enabled: boolean
  /** Width-to-height aspect ratio of the guide frame. Defaults to 1.6 (ID card). Use 0.714 for passport. */
  aspectRatio?: number
}

// Analysis canvas width — height is derived from the video's aspect ratio so we
// don't introduce non-uniform scaling distortion when downsampling.
const ANALYSIS_WIDTH = 320
const TARGET_FPS = 10
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS
const STABILITY_MS = 400

// Sobel kernels for edge detection
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

/**
 * Detection algorithm: Sobel edges concentrated at the guide perimeter.
 *
 * Now that the camera streams at 1920×1080 with continuous autofocus, edges are
 * sharp enough that this classical approach works reliably. We require:
 *
 *   1. Each of the four guide sides (top/bottom/left/right) has enough strong
 *      edge pixels in its outer band — the document's border is sitting there.
 *   2. The outer-band edge density is meaningfully greater than the inner-area
 *      edge density — rules out a smaller floating document or pure background clutter.
 *   3. Center region has texture (variance) — rules out a hand or uniform surface.
 */
function checkDocument(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  aspectRatio: number
): boolean {
  const edges = sobelEdgeStrength(pixels, w, h)
  const threshold = 60

  // Guide zone, clamped so it always fits the analysis canvas
  const isPortrait = aspectRatio < 1
  let gw = isPortrait ? Math.round(Math.min(w, h) * 0.75 * aspectRatio) : Math.round(w * 0.85)
  let gh = Math.round(gw / aspectRatio)
  if (gh > h * 0.85) {
    gh = Math.round(h * 0.85)
    gw = Math.round(gh * aspectRatio)
  }
  if (gw > w * 0.85) {
    gw = Math.round(w * 0.85)
    gh = Math.round(gw / aspectRatio)
  }
  const gx = Math.round((w - gw) / 2)
  const gy = Math.round((h - gh) / 2)

  // Outer band where the document edge should sit (12% inward from guide border)
  const outerV = Math.max(3, Math.round(gh * 0.12))
  const outerH = Math.max(3, Math.round(gw * 0.12))

  // Inner band — where a smaller floating document would show its edges instead
  const innerStartV = Math.round(gh * 0.20)
  const innerEndV   = Math.round(gh * 0.40)
  const innerStartH = Math.round(gw * 0.20)
  const innerEndH   = Math.round(gw * 0.40)

  let outTop = 0, outBottom = 0, outLeft = 0, outRight = 0
  let outTopN = 0, outBottomN = 0, outLeftN = 0, outRightN = 0
  let inTop = 0, inBottom = 0, inLeft = 0, inRight = 0
  let inTopN = 0, inBottomN = 0, inLeftN = 0, inRightN = 0

  for (let py = gy; py < gy + gh; py++) {
    for (let px = gx; px < gx + gw; px++) {
      const strong = edges[py * w + px] > threshold
      const dT = py - gy
      const dB = (gy + gh - 1) - py
      const dL = px - gx
      const dR = (gx + gw - 1) - px

      if (dT < outerV)    { outTopN++;    if (strong) outTop++ }
      if (dB < outerV)    { outBottomN++; if (strong) outBottom++ }
      if (dL < outerH)    { outLeftN++;   if (strong) outLeft++ }
      if (dR < outerH)    { outRightN++;  if (strong) outRight++ }

      if (dT >= innerStartV && dT < innerEndV) { inTopN++;    if (strong) inTop++ }
      if (dB >= innerStartV && dB < innerEndV) { inBottomN++; if (strong) inBottom++ }
      if (dL >= innerStartH && dL < innerEndH) { inLeftN++;   if (strong) inLeft++ }
      if (dR >= innerStartH && dR < innerEndH) { inRightN++;  if (strong) inRight++ }
    }
  }

  const outerTopD    = outTopN    ? outTop    / outTopN    : 0
  const outerBottomD = outBottomN ? outBottom / outBottomN : 0
  const outerLeftD   = outLeftN   ? outLeft   / outLeftN   : 0
  const outerRightD  = outRightN  ? outRight  / outRightN  : 0

  const innerTopD    = inTopN    ? inTop    / inTopN    : 0
  const innerBottomD = inBottomN ? inBottom / inBottomN : 0
  const innerLeftD   = inLeftN   ? inLeft   / inLeftN   : 0
  const innerRightD  = inRightN  ? inRight  / inRightN  : 0

  // Each side: outer band has enough strong edges AND has more than the inner band
  const sideOk = (outer: number, inner: number) => outer > 0.07 && outer > inner * 1.4

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
  const sharpnessOk = variance > 60

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
            // Derive analysis height from the video's actual aspect ratio — preserves
            // proportions so the guide-zone calculation matches what the user sees.
            const analysisHeight = Math.max(
              80,
              Math.round((ANALYSIS_WIDTH * video.videoHeight) / video.videoWidth),
            )
            if (canvas.width !== ANALYSIS_WIDTH || canvas.height !== analysisHeight) {
              canvas.width = ANALYSIS_WIDTH
              canvas.height = analysisHeight
            }
            const ctx = canvas.getContext("2d", { willReadFrequently: true })
            if (ctx) {
              ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, analysisHeight)
              const imageData = ctx.getImageData(0, 0, ANALYSIS_WIDTH, analysisHeight)
              const detected = checkDocument(imageData.data, ANALYSIS_WIDTH, analysisHeight, aspectRatio)

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
