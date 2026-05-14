"use client"

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { Category, Matrix } from "@mediapipe/tasks-vision"
import { CameraCapture } from "./camera-capture"
import { useVerificationStore } from "@/lib/verification-store"
import { useLiveness } from "./liveness-context"
import { Loader2, CheckCircle2, SmilePlus, Eye, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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
      const landmarks = results.faceLandmarks?.[0]
      if (landmarks && landmarks.length > 263) {
        // Key landmark indices: outer eye corners (33, 263), nose tip (1), forehead (10), chin (152)
        const xs = [landmarks[33].x, landmarks[263].x, landmarks[1].x]
        const ys = [landmarks[10].y, landmarks[152].y]
        const faceLeft   = Math.min(...xs)
        const faceRight  = Math.max(...xs)
        const faceTop    = Math.min(...ys)
        const faceBottom = Math.max(...ys)

        const faceCenterX = (faceLeft + faceRight) / 2
        const faceCenterY = (faceTop + faceBottom) / 2
        const faceWidth   = faceRight - faceLeft

        // Circle guide: centered at 0.5,0.5 with radius ~37.5% of frame width
        const cx = 0.5, cy = 0.5, r = 0.375

        const centered = Math.abs(faceCenterX - cx) < 0.12 && Math.abs(faceCenterY - cy) < 0.12
        const goodSize = faceWidth > 0.35 && faceWidth < 0.75
        const fullyIn  = (
          faceLeft   > (cx - r + 0.05) &&
          faceRight  < (cx + r - 0.05) &&
          faceTop    > (cy - r + 0.05) &&
          faceBottom < (cy + r - 0.05)
        )

        const aligned = centered && goodSize && fullyIn
        setFaceAligned(aligned)

        if (aligned) {
          setFaceStatus("aligned")
        } else if (faceWidth < 0.35) {
          setFaceStatus("too_far")
        } else if (faceWidth > 0.75) {
          setFaceStatus("too_close")
        } else if (!centered) {
          setFaceStatus("off_center")
        } else {
          setFaceStatus("none")
        }
      } else {
        setFaceAligned(false)
        setFaceStatus("none")
      }
      // ────────────────────────────────────────────────────────────────────────

      if (!cooldownRef.current && results.faceBlendshapes && results.faceBlendshapes.length > 0) {
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
      />

      {/* Hidden canvas used to take snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Complete button — shown once all challenges pass */}
      {livenessPassed && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10 px-6">
          <Button
            type="button"
            onClick={() => void handleComplete()}
            className="h-14 w-full max-w-sm rounded-xl text-base font-semibold"
            size="lg"
          >
            <CheckCircle2 className="w-5 h-5" />
            Continue to submit
          </Button>
        </div>
      )}

      {/* Challenge progress overlay */}
      <div className="absolute top-28 left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="bg-background/95 backdrop-blur-sm px-4 py-2.5 rounded-xl flex items-center gap-3 border border-border shadow-sm">
          {isInitializing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : livenessPassed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <div className="flex gap-1.5">
              {challenges.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                    i < completedCount
                      ? "bg-green-500"
                      : i === completedCount
                      ? "bg-primary"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
          )}
          <span className="font-medium text-sm text-foreground">
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
