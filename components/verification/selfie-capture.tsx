"use client"

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { Category } from "@mediapipe/tasks-vision"
import { useVerificationStore } from "@/lib/verification-store"
import { useLiveness } from "./liveness-context"
import { ArrowRight, Loader2, CheckCircle2, SmilePlus, Eye, ArrowLeft, ArrowRight as ArrowRightIcon, Camera } from "lucide-react"

// Baseline-capture timings — kept here so the analyze loop and the UI agree
const BASELINE_HOLD_MS = 800        // how long the face must stay centered before snap
const BASELINE_CONFIRM_MS = 700     // how long "Got it!" stays on screen before challenges start

type ChallengeType = "smile" | "blink" | "turn_head_left" | "turn_head_right"
const ALL_CHALLENGES: ChallengeType[] = ["smile", "blink", "turn_head_left", "turn_head_right"]

const CHALLENGE_LABELS: Record<ChallengeType, string> = {
  smile:           "Smile!",
  blink:           "Blink both eyes!",
  turn_head_left:  "Turn head left",
  turn_head_right: "Turn head right",
}

const CHALLENGE_ICONS: Record<ChallengeType, ReactNode> = {
  smile:           <SmilePlus size={16} className="shrink-0" />,
  blink:           <Eye size={16} className="shrink-0" />,
  turn_head_left:  <ArrowLeft size={16} className="shrink-0" />,
  turn_head_right: <ArrowRightIcon size={16} className="shrink-0" />,
}

export function SelfieCapture() {
  const { setSelfieImage, setLivenessImages, submitVerification } = useVerificationStore()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { landmarker, initLivenessEngine, isInitializing, error: mpError } = useLiveness()

  const [challenges, setChallenges] = useState<ChallengeType[]>([])
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0)
  const [livenessPassed, setLivenessPassed] = useState(false)
  const [capturedSnapshots, setCapturedSnapshots] = useState<string[]>([])
  const cooldownRef = useRef(false)

  // Baseline (neutral, centered) selfie — captured before challenges and sent to backend for face matching
  const [baselineImage, setBaselineImage] = useState<string | null>(null)
  const baselineImageRef = useRef<string | null>(null)
  const baselineHoldStartRef = useRef<number>(0)
  const [baselineJustCaptured, setBaselineJustCaptured] = useState(false)

  const [faceAligned, setFaceAligned] = useState(false)
  const [faceStatus, setFaceStatus] = useState<"none" | "too_far" | "too_close" | "off_center" | "aligned">("none")
  const faceAlignedRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Start the front camera on mount, stop on unmount
  useEffect(() => {
    let cancelled = false

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Request 1080p so the baseline image carries enough detail for ID face matching
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      } catch {
        // Camera permission denied or unavailable — the video element stays black; user sees instructions
      }
    }

    void start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    const shuffled = [...ALL_CHALLENGES].sort(() => 0.5 - Math.random())
    setChallenges(shuffled.slice(0, 3))
  }, [])

  useEffect(() => { void initLivenessEngine() }, [initLivenessEngine])

  useEffect(() => {
    if (challenges.length > 0 && currentChallengeIndex >= challenges.length && !livenessPassed) {
      setLivenessPassed(true)
    }
  }, [challenges.length, currentChallengeIndex, livenessPassed])

  const handleComplete = async () => {
    // Challenge snapshots prove liveness; baseline (neutral, centered) is what the backend uses for face matching
    setLivenessImages(capturedSnapshots)
    const faceMatchImage = baselineImage ?? capturedSnapshots[capturedSnapshots.length - 1]
    if (faceMatchImage) setSelfieImage(faceMatchImage)
    await submitVerification()
  }

  const captureSnapshot = useCallback((highQuality: boolean): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    // Baseline goes to face-matching → keep full source resolution & near-lossless JPEG.
    // Liveness frames are only used to prove motion → smaller + cheaper to upload.
    const maxWidth = highQuality ? 1920 : 720
    const quality = highQuality ? 0.92 : 0.8
    const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", quality)
  }, [])

  const lastVideoTimeRef = useRef<number>(-1)
  const analyzeRef = useRef<() => void>(() => {})
  const holdStartTimeRef = useRef<number>(0)

  analyzeRef.current = () => {
    if (!videoRef.current || !landmarker || livenessPassed) return
    const video = videoRef.current
    if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
      lastVideoTimeRef.current = video.currentTime
      const results = landmarker.detectForVideo(video, performance.now())

      const landmarks = results.faceLandmarks?.[0]
      if (landmarks && landmarks.length > 263) {
        const vw = video.videoWidth, vh = video.videoHeight
        const squareSide = Math.min(vw, vh)
        const cropOffsetX = (vw - squareSide) / 2 / vw
        const cropOffsetY = (vh - squareSide) / 2 / vh
        const cropScaleX = vw / squareSide
        const cropScaleY = vh / squareSide
        const toSquareX = (x: number) => (x - cropOffsetX) * cropScaleX
        const toSquareY = (y: number) => (y - cropOffsetY) * cropScaleY

        const xs = [landmarks[33].x, landmarks[263].x, landmarks[1].x].map(toSquareX)
        const ys = [landmarks[10].y, landmarks[152].y].map(toSquareY)
        const faceLeft = Math.min(...xs), faceRight = Math.max(...xs)
        const faceTop = Math.min(...ys), faceBottom = Math.max(...ys)
        const faceCenterX = (faceLeft + faceRight) / 2
        const faceCenterY = (faceTop + faceBottom) / 2
        const faceWidth = faceRight - faceLeft
        const cx = 0.5, cy = 0.5, r = 0.425

        const centered = Math.abs(faceCenterX - cx) < 0.18 && Math.abs(faceCenterY - cy) < 0.20
        const goodSize = faceWidth > 0.22 && faceWidth < 0.38
        const fullyIn = faceLeft > (cx - r) && faceRight < (cx + r) && faceTop > (cy - r) && faceBottom < (cy + r)
        const aligned = centered && goodSize && fullyIn

        setFaceAligned(aligned)
        faceAlignedRef.current = aligned

        if (aligned) setFaceStatus("aligned")
        else if (faceWidth < 0.22) setFaceStatus("too_far")
        else if (faceWidth > 0.38) setFaceStatus("too_close")
        else if (!centered) setFaceStatus("off_center")
        else setFaceStatus("none")
      } else {
        setFaceAligned(false)
        faceAlignedRef.current = false
        setFaceStatus("none")
      }

      if (!faceAlignedRef.current) {
        holdStartTimeRef.current = 0
        baselineHoldStartRef.current = 0
      } else if (!baselineImageRef.current) {
        // Phase 1 — capture a neutral, centered baseline before any challenge expression distorts the face.
        // This image is what the backend uses for face matching against the ID.
        if (baselineHoldStartRef.current === 0) {
          baselineHoldStartRef.current = performance.now()
        } else if (performance.now() - baselineHoldStartRef.current >= BASELINE_HOLD_MS) {
          const snap = captureSnapshot(true)
          if (snap) {
            baselineImageRef.current = snap
            setBaselineImage(snap)
            setBaselineJustCaptured(true)
            // Block challenge evaluation while the "Got it!" confirmation is showing
            cooldownRef.current = true
            setTimeout(() => {
              setBaselineJustCaptured(false)
              cooldownRef.current = false
            }, BASELINE_CONFIRM_MS)
          }
        }
      } else if (!cooldownRef.current && results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const shapes: Category[] = results.faceBlendshapes[0].categories
        const currentChallenge = challenges[currentChallengeIndex]
        let passed = false

        if (currentChallenge === "smile") {
          const L = shapes.find(s => s.categoryName === "mouthSmileLeft")?.score ?? 0
          const R = shapes.find(s => s.categoryName === "mouthSmileRight")?.score ?? 0
          if (L > 0.5 && R > 0.5) passed = true
        } else if (currentChallenge === "blink") {
          const L = shapes.find(s => s.categoryName === "eyeBlinkLeft")?.score ?? 0
          const R = shapes.find(s => s.categoryName === "eyeBlinkRight")?.score ?? 0
          if (L > 0.4 && R > 0.4) passed = true
        } else if (currentChallenge === "turn_head_left" || currentChallenge === "turn_head_right") {
          if (results.facialTransformationMatrixes?.length > 0) {
            const data = results.facialTransformationMatrixes[0].data
            const yaw = Math.atan2(-data[8], Math.sqrt(data[9] ** 2 + data[10] ** 2)) * 180 / Math.PI
            if (currentChallenge === "turn_head_left" && yaw < -20) passed = true
            if (currentChallenge === "turn_head_right" && yaw > 20) passed = true
          }
        }

        if (passed) {
          if (holdStartTimeRef.current === 0) {
            holdStartTimeRef.current = performance.now()
          } else {
            const required = currentChallenge === "blink" ? 150 : 800
            if (performance.now() - holdStartTimeRef.current >= required) {
              cooldownRef.current = true
              holdStartTimeRef.current = 0
              const snap = captureSnapshot(false)
              setCapturedSnapshots(prev => snap ? [...prev, snap] : prev)
              setCurrentChallengeIndex(ci => {
                const next = ci + 1
                if (next < challenges.length) setTimeout(() => { cooldownRef.current = false }, 2500)
                return next
              })
            }
          }
        } else {
          holdStartTimeRef.current = 0
        }
      }
    }
  }

  useEffect(() => {
    if (!landmarker || livenessPassed) return
    let active = true
    const loop = () => { if (active) { analyzeRef.current(); requestAnimationFrame(loop) } }
    requestAnimationFrame(loop)
    return () => { active = false }
  }, [landmarker, livenessPassed])

  const completedCount = currentChallengeIndex
  const currentChallenge = challenges[currentChallengeIndex]

  const baselineCaptured = !!baselineImage

  // Hint pill text
  const hintText = (): string => {
    if (isInitializing) return "Loading face detection…"
    if (mpError) return "Face detection unavailable"
    if (livenessPassed) return "Liveness check complete ✓"
    if (!faceAligned) {
      if (faceStatus === "too_far") return "Move closer"
      if (faceStatus === "too_close") return "Move back a little"
      if (faceStatus === "off_center") return "Center your face"
      return "Look at the camera"
    }
    if (baselineJustCaptured) return "Got it — starting checks…"
    if (!baselineCaptured) return "Hold still…"
    if (currentChallenge) return CHALLENGE_LABELS[currentChallenge]
    return "Hold still…"
  }

  // Title shown above circle
  const titleText = livenessPassed
    ? "All done!"
    : baselineJustCaptured
    ? "Got it!"
    : faceAligned && !baselineCaptured
    ? "Hold still…"
    : faceAligned && currentChallenge
    ? CHALLENGE_LABELS[currentChallenge]
    : "Center your face"

  return (
    <div className="flex flex-col flex-1 bg-(--sv-paper)">
      {/* Header text */}
      <div className="px-5 pt-5 pb-3 text-center">
        <h2 className="sv-h2 mb-1">{titleText}</h2>
        <p className="sv-lede">
          {livenessPassed
            ? "Your liveness check is complete."
            : baselineJustCaptured
            ? "Now we'll run a few quick checks."
            : faceAligned && !baselineCaptured
            ? "We're taking a reference photo to match against your ID."
            : "We'll detect motion to confirm it's you. Nothing is stored after."}
        </p>
      </div>

      {/* Circle camera — fills remaining space */}
      <div className="flex flex-1 flex-col items-center justify-center px-5">
        <div className="relative w-full max-w-85 aspect-square">
          {/* Outer ring glow */}
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
            faceAligned && !livenessPassed
              ? "shadow-[0_0_0_6px_rgba(44,91,255,0.15)]"
              : ""
          }`} />

          {/* Video circle */}
          <div className="absolute inset-0 rounded-full overflow-hidden bg-[#2a2a3a]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
            />
          </div>

          {/* Ring border */}
          <div className={`absolute inset-0 rounded-full border-[3px] pointer-events-none transition-all duration-500 ${
            livenessPassed
              ? "border-(--sv-success)"
              : baselineJustCaptured
              ? "border-(--sv-success) shadow-[0_0_0_6px_rgba(34,197,94,0.18)]"
              : faceAligned
              ? "border-(--sv-brand)"
              : faceStatus === "too_close"
              ? "border-(--sv-warning) animate-pulse"
              : "border-white/30"
          }`} />

          {/* Challenge icon dot at top */}
          {faceAligned && currentChallenge && !livenessPassed && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-(--sv-brand)" />
          )}
        </div>

        {/* Hint pill below circle */}
        <div className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-full bg-(--sv-card) border border-(--sv-hairline) shadow-sm">
          {isInitializing && <Loader2 size={14} className="animate-spin text-(--sv-brand) shrink-0" />}
          {livenessPassed && <CheckCircle2 size={14} className="text-(--sv-success) shrink-0" />}
          {!isInitializing && !livenessPassed && baselineJustCaptured && (
            <CheckCircle2 size={14} className="text-(--sv-success) shrink-0" />
          )}
          {!isInitializing && !livenessPassed && !baselineJustCaptured && faceAligned && !baselineCaptured && (
            <Camera size={14} className="text-(--sv-brand) shrink-0" />
          )}
          {!isInitializing && !livenessPassed && baselineCaptured && !baselineJustCaptured && currentChallenge && (
            CHALLENGE_ICONS[currentChallenge]
          )}
          <span className="text-[13px] font-medium text-(--sv-ink-2)">{hintText()}</span>
        </div>

        {/* Progress dots */}
        {!livenessPassed && challenges.length > 0 && (
          <div className="mt-4 flex items-center gap-1.5">
            {challenges.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-400 ${
                  i < completedCount
                    ? "w-5 bg-(--sv-ink-2)"
                    : i === completedCount
                    ? "w-7 bg-(--sv-brand)"
                    : "w-5 bg-(--sv-ink-4)"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hidden canvas for snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Continue button — only when passed */}
      <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
        {livenessPassed ? (
          <button
            type="button"
            onClick={() => void handleComplete()}
            className="sv-cta-arrow w-full"
          >
            <span>Continue to submit</span>
            <div className="sv-cta-arrow-chip">
              <ArrowRight size={16} />
            </div>
          </button>
        ) : (
          <div className="h-14" /> // spacer to keep layout stable
        )}
      </div>
    </div>
  )
}
