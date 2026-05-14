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
const STABILITY_MS = 600

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
  const threshold = 80

  // Guide zone: matches the on-screen overlay (85% width for landscape, 85% height for portrait)
  const isPortrait = aspectRatio < 1
  const gw = isPortrait ? Math.round(Math.min(w, h) * 0.75 * aspectRatio) : Math.round(w * 0.85)
  const gh = Math.round(gw / aspectRatio)
  const gx = Math.round((w - gw) / 2)
  const gy = Math.round((h - gh) / 2)

  // Edge band width for perimeter sampling (10% of guide dims)
  const bw = Math.max(2, Math.round(gw * 0.10))
  const bh = Math.max(2, Math.round(gh * 0.10))

  let topEdges = 0, bottomEdges = 0, leftEdges = 0, rightEdges = 0
  let topTotal = 0, bottomTotal = 0, leftTotal = 0, rightTotal = 0

  for (let py = gy; py < gy + gh; py++) {
    for (let px = gx; px < gx + gw; px++) {
      const e = edges[py * w + px]
      const inTop    = py < gy + bh
      const inBottom = py >= gy + gh - bh
      const inLeft   = px < gx + bw
      const inRight  = px >= gx + gw - bw

      if (inTop)    { topTotal++;    if (e > threshold) topEdges++ }
      if (inBottom) { bottomTotal++; if (e > threshold) bottomEdges++ }
      if (inLeft)   { leftTotal++;   if (e > threshold) leftEdges++ }
      if (inRight)  { rightTotal++;  if (e > threshold) rightEdges++ }
    }
  }

  const topDensity    = topTotal    > 0 ? topEdges    / topTotal    : 0
  const bottomDensity = bottomTotal > 0 ? bottomEdges / bottomTotal : 0
  const leftDensity   = leftTotal   > 0 ? leftEdges   / leftTotal   : 0
  const rightDensity  = rightTotal  > 0 ? rightEdges  / rightTotal  : 0

  // All four sides must have meaningful edge density
  const edgeDensityOk = (
    topDensity    > 0.08 &&
    bottomDensity > 0.08 &&
    leftDensity   > 0.08 &&
    rightDensity  > 0.08
  )

  // Sharpness: pixel intensity variance in the center 50% of the guide
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
  const sharpnessOk = variance > 200

  return edgeDensityOk && sharpnessOk
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
