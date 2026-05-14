"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** The container element that displays the video with `object-cover`. */
  containerRef: React.RefObject<HTMLElement | null>
  enabled: boolean
  /** Width-to-height aspect ratio of the guide frame. Defaults to 1.6 (ID card). Use 0.714 for passport. */
  aspectRatio?: number
}

const ANALYSIS_LONG_EDGE = 360
const TARGET_FPS = 10
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS
const STABILITY_MS = 350

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

/**
 * Each of the four outer perimeter bands must have enough strong edge pixels.
 * The analysis canvas now mirrors what the user sees (object-cover-cropped),
 * so the on-screen guide and the analysis guide cover the exact same region of
 * the world — no ratio guard needed; a small document inside the guide simply
 * won't produce strong edges in the outer bands of the guide.
 */
function checkDocument(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  aspectRatio: number
): boolean {
  const edges = sobelEdgeStrength(pixels, w, h)
  const threshold = 40

  // Guide: 85% of the visible area (matches the on-screen overlay)
  const isPortrait = aspectRatio < 1
  let gw = isPortrait ? Math.round(h * 0.85 * aspectRatio) : Math.round(w * 0.85)
  let gh = Math.round(gw / aspectRatio)
  if (gh > h * 0.85) { gh = Math.round(h * 0.85); gw = Math.round(gh * aspectRatio) }
  if (gw > w * 0.85) { gw = Math.round(w * 0.85); gh = Math.round(gw / aspectRatio) }
  const gx = Math.round((w - gw) / 2)
  const gy = Math.round((h - gh) / 2)

  const bandV = Math.max(3, Math.round(gh * 0.13))
  const bandH = Math.max(3, Math.round(gw * 0.13))

  let topStrong = 0, bottomStrong = 0, leftStrong = 0, rightStrong = 0
  let topN = 0, bottomN = 0, leftN = 0, rightN = 0

  for (let py = gy; py < gy + gh; py++) {
    for (let px = gx; px < gx + gw; px++) {
      const strong = edges[py * w + px] > threshold
      const dT = py - gy
      const dB = (gy + gh - 1) - py
      const dL = px - gx
      const dR = (gx + gw - 1) - px

      if (dT < bandV) { topN++;    if (strong) topStrong++ }
      if (dB < bandV) { bottomN++; if (strong) bottomStrong++ }
      if (dL < bandH) { leftN++;   if (strong) leftStrong++ }
      if (dR < bandH) { rightN++;  if (strong) rightStrong++ }
    }
  }

  const topD    = topN    ? topStrong    / topN    : 0
  const bottomD = bottomN ? bottomStrong / bottomN : 0
  const leftD   = leftN   ? leftStrong   / leftN   : 0
  const rightD  = rightN  ? rightStrong  / rightN  : 0

  // Each side needs ≥3% strong-edge pixels — very permissive.
  // At least 3 of the 4 sides must pass (one weak side can be a corner being clipped).
  const sidesPassing = [topD, bottomD, leftD, rightD].filter((d) => d > 0.03).length
  const edgesOk = sidesPassing >= 3

  // Sharpness sanity check: variance in the inner 60% of the guide
  const cx1 = gx + Math.round(gw * 0.20)
  const cx2 = gx + Math.round(gw * 0.80)
  const cy1 = gy + Math.round(gh * 0.20)
  const cy2 = gy + Math.round(gh * 0.80)
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
  const mean = count > 0 ? sum / count : 0
  const variance = count > 0 ? sumSq / count - mean * mean : 0
  const sharpnessOk = variance > 30

  return edgesOk && sharpnessOk
}

/**
 * Compute the source-video crop rectangle that `object-cover` produces given
 * a destination container of (dstW × dstH). Returns the source rectangle in
 * source pixels.
 */
function objectCoverCrop(srcW: number, srcH: number, dstW: number, dstH: number) {
  const srcAspect = srcW / srcH
  const dstAspect = dstW / dstH

  if (srcAspect > dstAspect) {
    // Source is wider than destination — crop horizontally
    const cropW = srcH * dstAspect
    const cropX = (srcW - cropW) / 2
    return { sx: cropX, sy: 0, sw: cropW, sh: srcH }
  } else {
    // Source is taller than destination — crop vertically
    const cropH = srcW / dstAspect
    const cropY = (srcH - cropH) / 2
    return { sx: 0, sy: cropY, sw: srcW, sh: cropH }
  }
}

export function useDocumentDetection({
  videoRef,
  containerRef,
  enabled,
  aspectRatio = 1.6,
}: UseDocumentDetectionOptions) {
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
        const container = containerRef.current
        if (
          video && video.readyState >= 2 && video.videoWidth > 0 &&
          container && container.clientWidth > 0 && container.clientHeight > 0
        ) {
          try {
            // Match what the user sees: source crop = object-cover of the container
            const crop = objectCoverCrop(
              video.videoWidth, video.videoHeight,
              container.clientWidth, container.clientHeight,
            )

            // Analysis canvas: scale so the long edge is ANALYSIS_LONG_EDGE
            const visibleAspect = container.clientWidth / container.clientHeight
            const analysisW = visibleAspect >= 1
              ? ANALYSIS_LONG_EDGE
              : Math.round(ANALYSIS_LONG_EDGE * visibleAspect)
            const analysisH = visibleAspect >= 1
              ? Math.round(ANALYSIS_LONG_EDGE / visibleAspect)
              : ANALYSIS_LONG_EDGE

            const canvas = getOffscreen()
            if (canvas.width !== analysisW || canvas.height !== analysisH) {
              canvas.width = analysisW
              canvas.height = analysisH
            }
            const ctx = canvas.getContext("2d", { willReadFrequently: true })
            if (ctx) {
              // Draw ONLY the visible crop region of the source into the analysis canvas
              ctx.drawImage(
                video,
                crop.sx, crop.sy, crop.sw, crop.sh,
                0, 0, analysisW, analysisH,
              )
              const imageData = ctx.getImageData(0, 0, analysisW, analysisH)
              const detected = checkDocument(imageData.data, analysisW, analysisH, aspectRatio)

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
  }, [enabled, videoRef, containerRef, aspectRatio, getOffscreen])

  return { isDocumentDetected }
}
