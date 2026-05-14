"use client"

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { Category, Matrix } from "@mediapipe/tasks-vision"
import { CameraCapture } from "./camera-capture"
import { useVerificationStore } from "@/lib/verification-store"
import { useLiveness } from "./liveness-context"
import { ArrowRight, Loader2, CheckCircle2, SmilePlus, Eye, ArrowLeft, ArrowRight as ArrowRightIcon } from "lucide-react"

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

  const [faceAligned, setFaceAligned] = useState(false)
  const [faceStatus, setFaceStatus] = useState<"none" | "too_far" | "too_close" | "off_center" | "aligned">("none")
  const faceAlignedRef = useRef(false)

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
    setLivenessImages(capturedSnapshots)
    setSelfieImage(capturedSnapshots[capturedSnapshots.length - 1])
    await submitVerification()
  }

  const captureSnapshot = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    const MAX_WIDTH = 480
    const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1
    canvas.width = video.videoWidth * scale
    canvas.height = video.videoHeight * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.7)
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
              const snap = captureSnapshot()
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
    if (currentChallenge) return CHALLENGE_LABELS[currentChallenge]
    return "Hold still…"
  }

  // Title shown above circle
  const titleText = livenessPassed
    ? "All done!"
    : faceAligned && currentChallenge
    ? CHALLENGE_LABELS[currentChallenge]
    : "Center your face"

  return (
    <div className="flex flex-col flex-1 bg-(--sv-paper)">
      {/* Header text */}
      <div className="px-5 pt-5 pb-3 text-center">
        <h2 className="text-[22px] font-bold tracking-[-0.02em] text-(--sv-ink) mb-1">
          {titleText}
        </h2>
        <p className="text-[13px] text-(--sv-ink-3) leading-relaxed">
          {livenessPassed
            ? "Your liveness check is complete."
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
              ? "border-green-500"
              : faceAligned
              ? "border-(--sv-brand)"
              : faceStatus === "too_close"
              ? "border-amber-400 animate-pulse"
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
          {livenessPassed && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
          {!isInitializing && !livenessPassed && currentChallenge && CHALLENGE_ICONS[currentChallenge]}
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
      <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
        {livenessPassed ? (
          <button
            type="button"
            onClick={() => void handleComplete()}
            className="w-full h-14 rounded-2xl bg-(--sv-brand) text-white text-[15px] font-semibold flex items-center justify-between px-5 shadow-[0_4px_16px_rgba(44,91,255,0.3)] active:scale-[0.98] transition-transform touch-manipulation"
          >
            <span>Continue to submit</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
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
