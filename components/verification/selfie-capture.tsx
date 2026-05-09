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
  // Small cooldown to prevent double-detection of the same gesture
  const cooldownRef = useRef(false)

  // Pick challenges once per mount — do not re-run when `initLivenessEngine` identity changes
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

  // Store all 3 images when liveness is done
  const handleComplete = async () => {
    setLivenessImages(capturedSnapshots)
    setSelfieImage(capturedSnapshots[capturedSnapshots.length - 1])
    await submitVerification()
  }

  /** Grabs the current video frame to a JPEG data URL */
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

    // Mirror so the selfie looks natural (front camera is already mirrored in CSS)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    // Send small size for instantly fast uploads (480p at 70% quality compresses under 70KB)
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
            // First frame passing the threshold, start the timer
            holdStartTimeRef.current = performance.now();
          } else {
            // Blinks are fast (require only 150ms), smiles/turns require 800ms to stabilize
            const requiredHoldTime = currentChallenge === "blink" ? 150 : 800;
            const holdDuration = performance.now() - holdStartTimeRef.current;

            if (holdDuration >= requiredHoldTime) {
              // Successfully held for long enough, take the snapshot
              cooldownRef.current = true;
              holdStartTimeRef.current = 0; // reset

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
          // If the user drops the pose before 800ms, reset the timer
          holdStartTimeRef.current = 0;
        }
      }
    }
  }

  // The master polling loop
  useEffect(() => {
    if (!landmarker || livenessPassed) return;

    let active = true;
    const loop = () => {
      if (active) {
        analyzeRef.current();
        requestAnimationFrame(loop);
      }
    };

    // Start loop
    requestAnimationFrame(loop);

    // Cleanup loop exactly once when unmounting or liveness finishes
    return () => {
      active = false;
    };
  }, [landmarker, livenessPassed]);

  const completedCount = currentChallengeIndex;
  const currentLabel: ReactNode = challenges[currentChallengeIndex]
    ? CHALLENGE_LABELS[challenges[currentChallengeIndex]]
    : "Preparing camera…";

  const instructions: ReactNode = isInitializing
    ? "Loading face detection… This may take up to a minute on a slow connection."
    : mpError
    ? `Face detection could not start: ${mpError.message}`
    : livenessPassed
    ? "Liveness check completed!"
    : currentLabel

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
      />

      {/* Hidden canvas used to take snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Complete button — shown once all challenges pass */}
      {livenessPassed && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10 px-6">
          <button
            type="button"
            onClick={() => void handleComplete()}
            className="h-14 w-full max-w-sm rounded-2xl bg-green-500 text-white font-semibold text-base shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Continue
          </button>
        </div>
      )}
      <div className="absolute top-28 left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="bg-background/85 backdrop-blur-md px-5 py-3 rounded-full flex items-center gap-3 border shadow-lg">
          {isInitializing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : livenessPassed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <div className="flex gap-2">
              {challenges.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i < completedCount
                      ? "bg-green-500 scale-90"
                      : i === completedCount
                      ? "bg-amber-400 animate-pulse scale-110"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}
          <span className="font-medium text-sm">
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
