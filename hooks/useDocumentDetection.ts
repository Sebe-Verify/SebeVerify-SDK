"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  enabled: boolean
  aspectRatio?: number
}

const ANALYSIS_LONG_EDGE = 320
const TARGET_FPS = 8
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS
const STABILITY_MS = 600   // must hold detected for this long before confirming

/**
 * Compute the source-video crop rectangle that `object-cover` produces.
 */
function objectCoverCrop(srcW: number, srcH: number, dstW: number, dstH: number) {
  const srcAspect = srcW / srcH
  const dstAspect = dstW / dstH
  if (srcAspect > dstAspect) {
    const cropW = srcH * dstAspect
    return { sx: (srcW - cropW) / 2, sy: 0, sw: cropW, sh: srcH }
  } else {
    const cropH = srcW / dstAspect
    return { sx: 0, sy: (srcH - cropH) / 2, sw: srcW, sh: cropH }
  }
}

/**
 * Convert RGBA pixel array to grayscale Float32Array.
 */
function toGrayscale(pixels: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    gray[i] = pixels[i * 4] * 0.299 + pixels[i * 4 + 1] * 0.587 + pixels[i * 4 + 2] * 0.114
  }
  return gray
}


/**
 * Check whether a document is present in the guide rectangle.
 *
 * Strategy: three independent signals, all must pass.
 *
 * 1. SHARPNESS — The guide interior must be in focus (Laplacian variance > threshold).
 *    A real document held at arm's length is sharp; a hand/distant object is soft.
 *
 * 2. EDGE FRAME — The four narrow bands just inside the guide boundary must collectively
 *    have enough strong gradient pixels. This catches the card edges.
 *    Uses a simple Sobel on just the border bands — fast and targeted.
 *
 * 3. INTERIOR BRIGHTNESS — The inner 70% of the guide must be reasonably bright
 *    (mean luminance > 60/255). This rejects a phone held in a dark pocket, etc.
 *    It does NOT require the interior to be uniform, so printed text/photos on the
 *    card still pass.
 *
 * What changed from the old version:
 * - Dropped the "uniformity guard" (innerDensity < outerEdgeMean) that was
 *   incorrectly rejecting real documents with printed content (text, photos, barcodes).
 * - Lowered the per-side edge density floor to 0.04 (was 0.06) so partially
 *   occluded corners still trigger detection.
 * - Changed "3 of 4 sides strong" to "all 4 sides present at ≥ 0.025" which is
 *   more stable than requiring 3 strong sides.
 * - Added Laplacian sharpness as the primary rejection signal for clutter:
 *   a cluttered desk scene has similar sharpness, BUT the card must also form a
 *   clean rectangle — the sharpness + edge-frame combination is much harder to
 *   fool accidentally than edge density alone.
 */
function checkDocument(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  aspectRatio: number
): boolean {
  const gray = toGrayscale(pixels, w, h)

  // ── Guide rect (matches on-screen 85% overlay) ──────────────────────────────
  const isPortrait = aspectRatio < 1
  let gw = isPortrait ? Math.round(h * 0.85 * aspectRatio) : Math.round(w * 0.85)
  let gh = Math.round(gw / aspectRatio)
  if (gh > h * 0.85) { gh = Math.round(h * 0.85); gw = Math.round(gh * aspectRatio) }
  if (gw > w * 0.85) { gw = Math.round(w * 0.85); gh = Math.round(gw / aspectRatio) }
  const gx = Math.round((w - gw) / 2)
  const gy = Math.round((h - gh) / 2)

  // ── 1. Sharpness (Laplacian variance over guide interior) ───────────────────
  // Compute over inner 80% to avoid card-edge gradients inflating the score.
  const ix1 = gx + Math.round(gw * 0.10)
  const ix2 = gx + Math.round(gw * 0.90)
  const iy1 = gy + Math.round(gh * 0.10)
  const iy2 = gy + Math.round(gh * 0.90)

  let lapSum = 0, lapSumSq = 0, lapCount = 0
  for (let py = iy1 + 1; py < iy2 - 1; py++) {
    for (let px = ix1 + 1; px < ix2 - 1; px++) {
      const lap =
        -gray[(py - 1) * w + px] +
        -gray[py * w + (px - 1)] +
        4 * gray[py * w + px] +
        -gray[py * w + (px + 1)] +
        -gray[(py + 1) * w + px]
      lapSum += lap
      lapSumSq += lap * lap
      lapCount++
    }
  }
  const lapMean = lapSum / lapCount
  const sharpness = lapCount > 0 ? lapSumSq / lapCount - lapMean * lapMean : 0
  // A real in-focus document needs at least ~40 variance.
  // Very blurry scenes or featureless objects score < 10.
  const sharpnessOk = sharpness > 40

  // ── 2. Edge frame (Sobel on the four border bands) ──────────────────────────
  const bandV = Math.max(4, Math.round(gh * 0.10))
  const bandH = Math.max(4, Math.round(gw * 0.10))

  let topStrong = 0, bottomStrong = 0, leftStrong = 0, rightStrong = 0
  let topN = 0, bottomN = 0, leftN = 0, rightN = 0
  const edgeThresh = 35

  for (let py = gy; py < gy + gh; py++) {
    for (let px = gx; px < gx + gw; px++) {
      // Simple 3×3 Sobel — only computed at interior pixels (skip outermost row/col)
      if (px < 1 || py < 1 || px >= w - 1 || py >= h - 1) continue

      const dT = py - gy
      const dB = (gy + gh - 1) - py
      const dL = px - gx
      const dR = (gx + gw - 1) - px

      const inBand = dT < bandV || dB < bandV || dL < bandH || dR < bandH
      if (!inBand) continue

      const gxS =
        -gray[(py - 1) * w + (px - 1)] + gray[(py - 1) * w + (px + 1)] +
        -2 * gray[py * w + (px - 1)] + 2 * gray[py * w + (px + 1)] +
        -gray[(py + 1) * w + (px - 1)] + gray[(py + 1) * w + (px + 1)]
      const gyS =
        -gray[(py - 1) * w + (px - 1)] - 2 * gray[(py - 1) * w + px] - gray[(py - 1) * w + (px + 1)] +
        gray[(py + 1) * w + (px - 1)] + 2 * gray[(py + 1) * w + px] + gray[(py + 1) * w + (px + 1)]
      const mag = Math.sqrt(gxS * gxS + gyS * gyS)
      const strong = mag > edgeThresh

      if (dT < bandV) { topN++;    if (strong) topStrong++ }
      if (dB < bandV) { bottomN++; if (strong) bottomStrong++ }
      if (dL < bandH) { leftN++;   if (strong) leftStrong++ }
      if (dR < bandH) { rightN++;  if (strong) rightStrong++ }
    }
  }

  const topD    = topN    > 0 ? topStrong    / topN    : 0
  const bottomD = bottomN > 0 ? bottomStrong / bottomN : 0
  const leftD   = leftN   > 0 ? leftStrong   / leftN   : 0
  const rightD  = rightN  > 0 ? rightStrong  / rightN  : 0

  // All four sides must have at least minimal edge activity (card is in frame),
  // and at least 2 sides must be strongly edged (>= 0.06).
  const allFourPresent = topD > 0.025 && bottomD > 0.025 && leftD > 0.025 && rightD > 0.025
  const strongSides = [topD, bottomD, leftD, rightD].filter(d => d > 0.06).length
  const edgesOk = allFourPresent && strongSides >= 2

  // ── 3. Interior brightness ───────────────────────────────────────────────────
  let brightnessSum = 0, brightnessCount = 0
  const bx1 = gx + Math.round(gw * 0.15)
  const bx2 = gx + Math.round(gw * 0.85)
  const by1 = gy + Math.round(gh * 0.15)
  const by2 = gy + Math.round(gh * 0.85)
  for (let py = by1; py < by2; py++) {
    for (let px = bx1; px < bx2; px++) {
      brightnessSum += gray[py * w + px]
      brightnessCount++
    }
  }
  const meanBrightness = brightnessCount > 0 ? brightnessSum / brightnessCount : 0
  // Must be at least moderately lit — rejects camera pointed at dark surface
  const brightnessOk = meanBrightness > 55

  return sharpnessOk && edgesOk && brightnessOk
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
            const crop = objectCoverCrop(
              video.videoWidth, video.videoHeight,
              container.clientWidth, container.clientHeight,
            )

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
              ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, analysisW, analysisH)
              const imageData = ctx.getImageData(0, 0, analysisW, analysisH)
              const detected = checkDocument(imageData.data, analysisW, analysisH, aspectRatio)

              if (detected) {
                if (detectedSinceRef.current === null) {
                  detectedSinceRef.current = timestamp
                }
                if (timestamp - detectedSinceRef.current >= STABILITY_MS && !stableDetectedRef.current) {
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
            // Ignore cross-origin / tainted canvas errors
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
