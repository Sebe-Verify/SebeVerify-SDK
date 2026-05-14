"use client"

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { Category, Matrix } from "@mediapipe/tasks-vision"
import { CameraCapture } from "./camera-capture"
import { useVerificationStore } from "@/lib/verification-store"
import { useLiveness } from "./liveness-context"
import { Loader2, CheckCircle2, SmilePlus, Eye, ArrowLeft, ArrowRight } from "lucide-react"

type ChallengeType = "smile" | "blink" | "turn_head_left" | "turn_head_right";
const ALL_CHALLENGES: ChallengeType[] = ["smile", "blink", "turn_head_left", "turn_head_right"];

const CHALLENGE_LABELS: Record<ChallengeType, ReactNode> = {
  smile:           <span className="flex items-center gap-2"><SmilePlus className="w-4 h-4 shrink-0" /> Smile!</span>,
  blink:           <span className="flex items-center gap-2"><Eye       className="w-4 h-4 shrink-0" /> Blink both eyes!</span>,
  turn_head_left:  <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4 shrink-0" /> Turn head left</span>,
  turn_head_right: <span className="flex items-center gap-2"><ArrowRight className="w-4 h-4 shrink-0" /> Turn head right</span>,
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

  // Face positioning state
  const [faceAligned, setFaceAligned] = useState(false)
  const [faceStatus, setFaceStatus] = useState<"none" | "too_far" | "too_close" | "off_center" | "aligned">("none")
  // Synchronously-readable mirror of faceAligned for the rAF loop (state lags by a frame)
  const faceAlignedRef = useRef(false)

  useEffect(() => {
    const shuffled = [...ALL_CHALLENGES].sort(() => 0.5 - Math.random())
    setChallenges(shuffled.slice(0, 3))
  }, [])

  useEffect(() => {
    void initLivenessEngine()
  }, [initLivenessEngine])

  useEffect(() => {
    if (
      challenges.length > 0 &&
      currentChallengeIndex >= challenges.length &&
      !livenessPassed
    ) {
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

    const MAX_WIDTH = 480;
    const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1;

    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
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
    if (!videoRef.current || !landmarker || livenessPassed) return;

    const video = videoRef.current;

    if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
      lastVideoTimeRef.current = video.currentTime;
      const results = landmarker.detectForVideo(video, performance.now());

      // ── Face positioning detection ──────────────────────────────────────────
      // Video is rendered as object-cover inside a 1:1 container, so the visible
      // square is the centered portion of the (typically wider) video frame.
      // We compute everything in the visible-square coordinate system.
      const landmarks = results.faceLandmarks?.[0]
      if (landmarks && landmarks.length > 263) {
        const vw = video.videoWidth
        const vh = video.videoHeight
        const squareSide = Math.min(vw, vh)
        const cropOffsetX = (vw - squareSide) / 2 / vw   // normalized offset in video coords
        const cropOffsetY = (vh - squareSide) / 2 / vh
        const cropScaleX  = vw / squareSide               // scale from video-norm to square-norm
        const cropScaleY  = vh / squareSide

        // Project a video-normalized coord into the visible 1:1 square (0..1)
        const toSquareX = (x: number) => (x - cropOffsetX) * cropScaleX
        const toSquareY = (y: number) => (y - cropOffsetY) * cropScaleY

        const xs = [landmarks[33].x, landmarks[263].x, landmarks[1].x].map(toSquareX)
        const ys = [landmarks[10].y, landmarks[152].y].map(toSquareY)
        const faceLeft   = Math.min(...xs)
        const faceRight  = Math.max(...xs)
        const faceTop    = Math.min(...ys)
        const faceBottom = Math.max(...ys)

        const faceCenterX = (faceLeft + faceRight) / 2
        const faceCenterY = (faceTop + faceBottom) / 2
        const faceWidth   = faceRight - faceLeft

        // Circle guide fills 85% of the visible square, so radius = 0.425 in square coords
        const cx = 0.5, cy = 0.5, r = 0.425

        // Industry-standard framing (Onfido/Veriff style): face occupies ~60-70% of
        // the circle diameter, with comfortable headroom around it. faceWidth here
        // is the outer-eye-corner span — a properly framed face shows eye corners
        // at ~22-36% of the visible square (i.e. ~28-42% of the circle diameter).
        const centered = Math.abs(faceCenterX - cx) < 0.18 && Math.abs(faceCenterY - cy) < 0.20
        const goodSize = faceWidth > 0.22 && faceWidth < 0.38
        const fullyIn  = (
          faceLeft   > (cx - r) &&
          faceRight  < (cx + r) &&
          faceTop    > (cy - r) &&
          faceBottom < (cy + r)
        )

        const aligned = centered && goodSize && fullyIn
        setFaceAligned(aligned)
        faceAlignedRef.current = aligned

        if (aligned) {
          setFaceStatus("aligned")
        } else if (faceWidth < 0.22) {
          setFaceStatus("too_far")
        } else if (faceWidth > 0.38) {
          setFaceStatus("too_close")
        } else if (!centered) {
          setFaceStatus("off_center")
        } else {
          setFaceStatus("none")
        }
      } else {
        setFaceAligned(false)
        faceAlignedRef.current = false
        setFaceStatus("none")
      }
      // ────────────────────────────────────────────────────────────────────────

      // Only allow a challenge to pass while the face is properly framed in the circle.
      // Drifting out of frame resets the hold timer too — so partial holds don't carry over.
      if (!faceAlignedRef.current) {
        holdStartTimeRef.current = 0
      } else if (!cooldownRef.current && results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const shapes: Category[] = results.faceBlendshapes[0].categories;
        const currentChallenge = challenges[currentChallengeIndex];
        let passed = false;

        if (currentChallenge === "smile") {
          const smileLeft = shapes.find((s) => s.categoryName === "mouthSmileLeft")?.score || 0;
          const smileRight = shapes.find((s) => s.categoryName === "mouthSmileRight")?.score || 0;
          if (smileLeft > 0.5 && smileRight > 0.5) passed = true;
        }
        else if (currentChallenge === "blink") {
          const blinkLeft = shapes.find((s) => s.categoryName === "eyeBlinkLeft")?.score || 0;
          const blinkRight = shapes.find((s) => s.categoryName === "eyeBlinkRight")?.score || 0;
          if (blinkLeft > 0.4 && blinkRight > 0.4) passed = true;
        }
        else if (currentChallenge === "turn_head_left" || currentChallenge === "turn_head_right") {
          if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
            const matrix: Matrix = results.facialTransformationMatrixes[0];
            const data = matrix.data;
            const yaw = Math.atan2(-data[8], Math.sqrt(data[9] * data[9] + data[10] * data[10])) * 180 / Math.PI;
            if (currentChallenge === "turn_head_left" && yaw < -20) passed = true;
            if (currentChallenge === "turn_head_right" && yaw > 20) passed = true;
          }
        }

        if (passed) {
          if (holdStartTimeRef.current === 0) {
            holdStartTimeRef.current = performance.now();
          } else {
            const requiredHoldTime = currentChallenge === "blink" ? 150 : 800;
            const holdDuration = performance.now() - holdStartTimeRef.current;

            if (holdDuration >= requiredHoldTime) {
              cooldownRef.current = true;
              holdStartTimeRef.current = 0;

              const snapshot = captureSnapshot();

              setCapturedSnapshots(prev => {
                return snapshot ? [...prev, snapshot] : prev;
              });

              setCurrentChallengeIndex((ci) => {
                const nextIndex = ci + 1;
                if (nextIndex < challenges.length) {
                  setTimeout(() => {
                    cooldownRef.current = false;
                  }, 2500);
                }
                return nextIndex;
              });
            }
          }
        } else {
          holdStartTimeRef.current = 0;
        }
      }
    }
  }

  useEffect(() => {
    if (!landmarker || livenessPassed) return;

    let active = true;
    const loop = () => {
      if (active) {
        analyzeRef.current();
        requestAnimationFrame(loop);
      }
    };

    requestAnimationFrame(loop);

    return () => {
      active = false;
    };
  }, [landmarker, livenessPassed]);

  const completedCount = currentChallengeIndex;

  // Build the instructions label shown in CameraCapture
  const getFacePositionLabel = (): ReactNode => {
    if (isInitializing) return "Loading face detection… This may take up to a minute on a slow connection."
    if (mpError) return `Face detection could not start: ${mpError.message}`
    switch (faceStatus) {
      case "too_far":   return "Move closer to the camera"
      case "too_close": return "Move back a little"
      case "off_center": return "Center your face in the circle"
      case "aligned":   return <span className="text-green-500 font-medium">Face detected ✓</span>
      default:          return "Center your face in the circle"
    }
  }

  const challengeLabel: ReactNode = challenges[currentChallengeIndex]
    ? CHALLENGE_LABELS[challenges[currentChallengeIndex]]
    : livenessPassed
    ? "Liveness check completed!"
    : "Preparing camera…"

  // Before liveness challenges start, show face positioning guidance; once running, show challenge
  const hasStartedChallenges = completedCount > 0 || (faceAligned && challenges.length > 0)
  const instructions: ReactNode = isInitializing || mpError
    ? getFacePositionLabel()
    : livenessPassed
    ? "Liveness check completed!"
    : hasStartedChallenges
    ? challengeLabel
    : getFacePositionLabel()

  return (
    <div className="flex flex-col flex-1 relative">
      <CameraCapture
        title="Active Liveness Check"
        instructions={instructions}
        onCapture={() => {}}
        capturedImage={null}
        overlayType="selfie"
        videoRef={videoRef}
        hideControls={true}
        isFaceDetected={faceAligned && !livenessPassed}
        isFaceTooClose={faceStatus === "too_close" && !livenessPassed}
      />

      {/* Hidden canvas used to take snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Complete button — shown once all challenges pass */}
      {livenessPassed && (
        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center px-5">
          <button
            type="button"
            onClick={() => void handleComplete()}
            className="sv-cta sv-cta-primary max-w-sm"
          >
            <CheckCircle2 size={20} />
            Continue to submit
          </button>
        </div>
      )}

      {/* Challenge progress bar */}
      <div className="absolute bottom-28 left-0 right-0 z-10 flex justify-center pointer-events-none px-5">
        <div className="sv-challenge-bar">
          {isInitializing ? (
            <Loader2 size={18} className="animate-spin text-(--sv-brand)" />
          ) : livenessPassed ? (
            <CheckCircle2 size={18} className="text-green-500" />
          ) : (
            <div className="sv-dots">
              {challenges.map((_, i) => (
                <div
                  key={i}
                  className={`sv-dot ${
                    i < completedCount ? "done" : i === completedCount ? "active" : ""
                  }`}
                />
              ))}
            </div>
          )}
          <span className="text-sm font-medium text-(--sv-ink)">
            {livenessPassed
              ? "Completed ✓"
              : isInitializing
              ? "Loading face detection…"
              : challenges.length > 0
                ? `Step ${Math.min(completedCount + 1, challenges.length)} of ${challenges.length}`
                : "Preparing…"}
          </span>
        </div>
      </div>
    </div>
  )
}
