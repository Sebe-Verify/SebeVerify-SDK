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

/**
 * Detection algorithm: foreground-vs-background luminance contrast.
 *
 * Reasoning: a document filling the guide will have a different average luminance
 * from the background visible at the corners of the analysis canvas (outside the guide).
 * This works for documents of any color against any background — we don't need to detect
 * "edges" or specific shapes. We just check that:
 *
 *   1. The guide interior has a meaningfully different average luminance than the outside.
 *   2. The guide interior has enough texture (non-trivial variance) — rules out a hand or
 *      uniform color filling the frame.
 *
 * This is far more robust than Sobel-based edge detection on low-quality phone video.
 */
function checkDocument(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  aspectRatio: number
): boolean {
  // Slightly smaller than the on-screen overlay so we have enough background
  // pixels around it for a reliable foreground/background contrast comparison.
  const isPortrait = aspectRatio < 1
  let gw = isPortrait ? Math.round(Math.min(w, h) * 0.65 * aspectRatio) : Math.round(w * 0.7)
  let gh = Math.round(gw / aspectRatio)
  // Clamp so the guide always fits inside the analysis canvas with room for a background ring
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

  // Background sample = pixels OUTSIDE the guide (the surrounding visible area)
  // Foreground sample = inner 70% of the guide (avoid the document's own border)
  const fxStart = gx + Math.round(gw * 0.15)
  const fxEnd   = gx + Math.round(gw * 0.85)
  const fyStart = gy + Math.round(gh * 0.15)
  const fyEnd   = gy + Math.round(gh * 0.85)

  let fgSum = 0, fgSumSq = 0, fgCount = 0
  let bgSum = 0, bgCount = 0

  // Stride of 2 — every other pixel is plenty at 320×200 and halves the work
  const stride = 2

  for (let py = 0; py < h; py += stride) {
    for (let px = 0; px < w; px += stride) {
      const idx = (py * w + px) * 4
      const lum = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114

      const inGuide = px >= gx && px < gx + gw && py >= gy && py < gy + gh

      if (!inGuide) {
        bgSum += lum
        bgCount++
      } else if (px >= fxStart && px < fxEnd && py >= fyStart && py < fyEnd) {
        fgSum += lum
        fgSumSq += lum * lum
        fgCount++
      }
    }
  }

  if (fgCount === 0 || bgCount === 0) return false

  const fgMean = fgSum / fgCount
  const bgMean = bgSum / bgCount
  const fgVariance = fgSumSq / fgCount - fgMean * fgMean

  // 1. Document is meaningfully different from background (≥ 12 luminance units on 0-255)
  const contrastOk = Math.abs(fgMean - bgMean) >= 12

  // 2. Document area has texture (not a uniform color or flat hand). Variance > 50 on 0-255 scale.
  const textureOk = fgVariance >= 50

  return contrastOk && textureOk
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
