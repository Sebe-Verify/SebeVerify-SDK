"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { toGrayscale, laplacianVariance, meanBrightness, type Region } from "@/lib/image-quality"

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
const DARK_HOLD_MS = 700   // must be dark for this long before we surface the hint

const BRIGHTNESS_MIN = 55
const SHARPNESS_MIN = 40
const EDGE_THRESH = 35
const EDGE_PRESENT_FRACTION = 0.025
const EDGE_STRONG_FRACTION = 0.06

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

interface CheckResult {
  detected: boolean
  brightnessOk: boolean
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
 *    (mean luminance > 55/255). This rejects a phone held in a dark pocket, etc.
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
  aspectRatio: number,
): CheckResult {
  const gray = toGrayscale(pixels, w, h)

  // ── Guide rect (matches on-screen 85% overlay) ──────────────────────────────
  const isPortrait = aspectRatio < 1
  let gw = isPortrait ? Math.round(h * 0.85 * aspectRatio) : Math.round(w * 0.85)
  let gh = Math.round(gw / aspectRatio)
  if (gh > h * 0.85) { gh = Math.round(h * 0.85); gw = Math.round(gh * aspectRatio) }
  if (gw > w * 0.85) { gw = Math.round(w * 0.85); gh = Math.round(gw / aspectRatio) }
  const gx = Math.round((w - gw) / 2)
  const gy = Math.round((h - gh) / 2)

  // ── 1. Sharpness (Laplacian variance over inner 80% of guide) ───────────────
  // Inner 80% avoids the card edges inflating the variance.
  const sharpRegion: Region = {
    x: gx + Math.round(gw * 0.10),
    y: gy + Math.round(gh * 0.10),
    w: Math.round(gw * 0.80),
    h: Math.round(gh * 0.80),
  }
  const sharpness = laplacianVariance(gray, w, h, sharpRegion)
  const sharpnessOk = sharpness > SHARPNESS_MIN

  // ── 2. Edge frame (Sobel on the four border bands) ──────────────────────────
  const bandV = Math.max(4, Math.round(gh * 0.10))
  const bandH = Math.max(4, Math.round(gw * 0.10))

  let topStrong = 0, bottomStrong = 0, leftStrong = 0, rightStrong = 0
  let topN = 0, bottomN = 0, leftN = 0, rightN = 0

  for (let py = gy; py < gy + gh; py++) {
    for (let px = gx; px < gx + gw; px++) {
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
      const strong = mag > EDGE_THRESH

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

  const allFourPresent =
    topD > EDGE_PRESENT_FRACTION && bottomD > EDGE_PRESENT_FRACTION &&
    leftD > EDGE_PRESENT_FRACTION && rightD > EDGE_PRESENT_FRACTION
  const strongSides = [topD, bottomD, leftD, rightD].filter(d => d > EDGE_STRONG_FRACTION).length
  const edgesOk = allFourPresent && strongSides >= 2

  // ── 3. Interior brightness (inner 70% of guide) ─────────────────────────────
  const brightRegion: Region = {
    x: gx + Math.round(gw * 0.15),
    y: gy + Math.round(gh * 0.15),
    w: Math.round(gw * 0.70),
    h: Math.round(gh * 0.70),
  }
  const brightness = meanBrightness(gray, w, h, brightRegion)
  const brightnessOk = brightness > BRIGHTNESS_MIN

  return {
    detected: sharpnessOk && edgesOk && brightnessOk,
    brightnessOk,
  }
}

export function useDocumentDetection({
  videoRef,
  containerRef,
  enabled,
  aspectRatio = 1.6,
}: UseDocumentDetectionOptions) {
  const [isDocumentDetected, setIsDocumentDetected] = useState(false)
  const [lightingIssue, setLightingIssue] = useState<"too_dark" | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)
  const detectedSinceRef = useRef<number | null>(null)
  const stableDetectedRef = useRef(false)
  const darkSinceRef = useRef<number | null>(null)
  const lightingIssueRef = useRef<"too_dark" | null>(null)

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
      darkSinceRef.current = null
      lightingIssueRef.current = null
      setIsDocumentDetected(false)
      setLightingIssue(null)
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
              const result = checkDocument(imageData.data, analysisW, analysisH, aspectRatio)

              if (result.detected) {
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

              // Lighting hint — debounced so a transient dark frame doesn't flicker the UI.
              // Suppressed once the document is confirmed (the green pill already tells the user it's working).
              if (!result.brightnessOk && !stableDetectedRef.current) {
                if (darkSinceRef.current === null) darkSinceRef.current = timestamp
                if (timestamp - darkSinceRef.current >= DARK_HOLD_MS && lightingIssueRef.current !== "too_dark") {
                  lightingIssueRef.current = "too_dark"
                  setLightingIssue("too_dark")
                }
              } else {
                darkSinceRef.current = null
                if (lightingIssueRef.current !== null) {
                  lightingIssueRef.current = null
                  setLightingIssue(null)
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

  return { isDocumentDetected, lightingIssue }
}
