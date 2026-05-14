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
  const threshold = 50

  // Guide zone matches the on-screen overlay
  const isPortrait = aspectRatio < 1
  const gw = isPortrait ? Math.round(Math.min(w, h) * 0.75 * aspectRatio) : Math.round(w * 0.85)
  const gh = Math.round(gw / aspectRatio)
  const gx = Math.round((w - gw) / 2)
  const gy = Math.round((h - gh) / 2)

  // Search range for each document edge: scan inward up to 15% of the guide dim.
  // We require the strongest edge line to sit within ~10% of the guide's outer border,
  // which means the document fills ≥ ~90% of the guide.
  const verticalSearch   = Math.max(4, Math.round(gh * 0.15))
  const horizontalSearch = Math.max(4, Math.round(gw * 0.15))
  const maxOffsetV       = Math.max(2, Math.round(gh * 0.10))
  const maxOffsetH       = Math.max(2, Math.round(gw * 0.10))
  const minLineDensity   = 0.30 // ≥30% of pixels along the line must be strong edges

  // Scan a horizontal line at row `py` across the guide width and return density of strong edges
  const horizontalLineDensity = (py: number): number => {
    if (py < 1 || py >= h - 1) return 0
    let strong = 0, total = 0
    for (let px = gx; px < gx + gw; px++) {
      if (edges[py * w + px] > threshold) strong++
      total++
    }
    return total > 0 ? strong / total : 0
  }

  const verticalLineDensity = (px: number): number => {
    if (px < 1 || px >= w - 1) return 0
    let strong = 0, total = 0
    for (let py = gy; py < gy + gh; py++) {
      if (edges[py * w + px] > threshold) strong++
      total++
    }
    return total > 0 ? strong / total : 0
  }

  // Find best top edge: scan from gy downward, track row with max density
  let bestTop = -1, bestTopDensity = 0
  for (let dy = 0; dy <= verticalSearch; dy++) {
    const d = horizontalLineDensity(gy + dy)
    if (d > bestTopDensity) { bestTopDensity = d; bestTop = dy }
  }

  let bestBottom = -1, bestBottomDensity = 0
  for (let dy = 0; dy <= verticalSearch; dy++) {
    const d = horizontalLineDensity(gy + gh - 1 - dy)
    if (d > bestBottomDensity) { bestBottomDensity = d; bestBottom = dy }
  }

  let bestLeft = -1, bestLeftDensity = 0
  for (let dx = 0; dx <= horizontalSearch; dx++) {
    const d = verticalLineDensity(gx + dx)
    if (d > bestLeftDensity) { bestLeftDensity = d; bestLeft = dx }
  }

  let bestRight = -1, bestRightDensity = 0
  for (let dx = 0; dx <= horizontalSearch; dx++) {
    const d = verticalLineDensity(gx + gw - 1 - dx)
    if (d > bestRightDensity) { bestRightDensity = d; bestRight = dx }
  }

  // Each side must (1) have a strong continuous line, (2) sit within max offset of guide border
  const topOk    = bestTopDensity    >= minLineDensity && bestTop    >= 0 && bestTop    <= maxOffsetV
  const bottomOk = bestBottomDensity >= minLineDensity && bestBottom >= 0 && bestBottom <= maxOffsetV
  const leftOk   = bestLeftDensity   >= minLineDensity && bestLeft   >= 0 && bestLeft   <= maxOffsetH
  const rightOk  = bestRightDensity  >= minLineDensity && bestRight  >= 0 && bestRight  <= maxOffsetH

  const fillOk = topOk && bottomOk && leftOk && rightOk

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
  const sharpnessOk = variance > 100

  return fillOk && sharpnessOk
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
