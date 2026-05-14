"use client"

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react"
import { RotateCcw, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDocumentDetection } from "@/hooks/useDocumentDetection"

// Centralizes the video stream so we never orphan tracks when React rapidly remounts
let activeGlobalStream: MediaStream | null = null;

const killGlobalStream = () => {
  if (activeGlobalStream) {
    activeGlobalStream.getTracks().forEach(t => {
      t.enabled = false;
      t.stop();
    });
    activeGlobalStream = null;
  }
}

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onRetake?: () => void
  capturedImage?: string | null
  title: string
  instructions: ReactNode
  overlayType?: "document" | "selfie"
  /** Width-to-height ratio of the document guide frame. Defaults to 1.6 (ID card landscape). Use 0.714 for passport portrait. */
  documentAspectRatio?: number
  videoRef?: React.RefObject<HTMLVideoElement | null>
  hideControls?: boolean
  isFaceDetected?: boolean
  isFaceTooClose?: boolean
}

export function CameraCapture({
  onCapture,
  onRetake,
  capturedImage,
  title,
  instructions,
  overlayType = "document",
  documentAspectRatio = 1.6,
  videoRef: externalVideoRef,
  hideControls = false,
  isFaceDetected = false,
  isFaceTooClose = false,
}: CameraCaptureProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    overlayType === "selfie" ? "user" : "environment"
  )

  const detectionEnabled = overlayType === "document" && !capturedImage && isReady
  const { isDocumentDetected } = useDocumentDetection({
    videoRef,
    containerRef: videoContainerRef,
    enabled: detectionEnabled,
    aspectRatio: documentAspectRatio,
  })

  const stopCamera = useCallback(() => {
    if (videoRef?.current) {
      videoRef.current.srcObject = null
    }
    killGlobalStream()
    setStream(null)
    setIsReady(false)
  }, [videoRef])

  const isRequestingRef = useRef(false)

  const startCamera = useCallback(
    async (overrideFacing?: "user" | "environment") => {
      if (isRequestingRef.current) return;

      const mode = overrideFacing ?? facingMode
      try {
        isRequestingRef.current = true;
        setError(null)

        if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== 'localhost') {
          setError(
            "Camera needs a secure connection (HTTPS). On your phone, open the app URL over HTTPS (e.g. ngrok or your deployed site), or use USB debugging with localhost — plain http:// to a LAN IP is blocked by browsers for camera access."
          )
          return
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError(
            "Camera is not available in this browser. Try Safari or Chrome, allow permissions, and use HTTPS if you are not on localhost."
          )
          return
        }

        killGlobalStream()
        setStream(null)

        let mediaStream: MediaStream | null = null
        let attempts = 0
        let lastError: unknown = null
        const maxAttempts = 6

        while (attempts < maxAttempts) {
          try {
            await new Promise((r) => setTimeout(r, attempts === 0 ? 300 : 800))

            // focusMode is in the MediaCapture spec but not yet in lib.dom types.
            const focusConstraint = { focusMode: "continuous", advanced: [{ focusMode: "continuous" }] } as unknown as MediaTrackConstraints

            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: mode },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                ...focusConstraint,
              },
              audio: false,
            })

            try {
              const [track] = mediaStream.getVideoTracks()
              if (track && "applyConstraints" in track) {
                await track.applyConstraints(focusConstraint)
              }
            } catch {
              // Not supported on this browser/device — fall through silently
            }
            break
          } catch (err) {
            lastError = err
            const name = err instanceof Error ? err.name : ""
            if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
              attempts++
            } else {
              throw err
            }
          }
        }

        if (!mediaStream) throw lastError

        if (activeGlobalStream && activeGlobalStream !== mediaStream) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        activeGlobalStream = mediaStream;
        setStream(mediaStream)
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        if (e.name === "AbortError" || e.message.includes("Timeout")) {
          setError("Camera took too long to start. Please close other apps using the camera and try again.")
        } else if (e.name === "NotAllowedError") {
          setError('Camera access was denied. Tap "Allow camera" again and choose Allow in the browser prompt, or enable camera in site settings.')
        } else if (e.name === "NotFoundError") {
          setError("No camera found on this device. Please use a device with a camera.")
        } else {
          setError(`Unable to access camera (${e.name}: ${e.message}). Please ensure camera permissions are granted and try again.`)
        }
      } finally {
        isRequestingRef.current = false;
      }
    },
    [facingMode]
  )

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => setIsReady(true)
      videoRef.current.onplay = () => setIsReady(true)
      videoRef.current.play().catch(() => { /* silent catch */ })
    }
  }, [stream])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    if (overlayType === "document") {
      const container = videoContainerRef.current
      const vw = video.videoWidth
      const vh = video.videoHeight

      let visW: number, visH: number, visX: number, visY: number
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        const srcAspect = vw / vh
        const dstAspect = container.clientWidth / container.clientHeight
        if (srcAspect > dstAspect) {
          visH = vh; visW = vh * dstAspect; visX = (vw - visW) / 2; visY = 0
        } else {
          visW = vw; visH = vw / dstAspect; visX = 0; visY = (vh - visH) / 2
        }
      } else {
        visW = vw; visH = vh; visX = 0; visY = 0
      }

      const isPortrait = documentAspectRatio < 1
      let gw = isPortrait ? visH * 0.85 * documentAspectRatio : visW * 0.85
      let gh = gw / documentAspectRatio
      if (gh > visH * 0.85) { gh = visH * 0.85; gw = gh * documentAspectRatio }
      if (gw > visW * 0.85) { gw = visW * 0.85; gh = gw / documentAspectRatio }
      const gx = visX + (visW - gw) / 2
      const gy = visY + (visH - gh) / 2

      canvas.width = Math.round(gw)
      canvas.height = Math.round(gh)
      context.drawImage(video, gx, gy, gw, gh, 0, 0, canvas.width, canvas.height)
      onCapture(canvas.toDataURL("image/jpeg", 1.0))
    } else {
      const MAX_WIDTH = 480
      const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1
      canvas.width = video.videoWidth * scale
      canvas.height = video.videoHeight * scale
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      onCapture(canvas.toDataURL("image/jpeg", 0.7))
    }

    stopCamera()
  }, [overlayType, onCapture, stopCamera, documentAspectRatio])

  const handleRetake = () => {
    onRetake?.()
    void startCamera()
  }

  const toggleCamera = () => {
    const next = facingMode === "user" ? "environment" : "user"
    setFacingMode(next)
    void startCamera(next)
  }

  const [hasAutoStarted, setHasAutoStarted] = useState(false)

  useEffect(() => {
    if (!hasAutoStarted && !capturedImage) {
      setHasAutoStarted(true)
      void startCamera()
    }
  }, [hasAutoStarted, capturedImage, startCamera])

  const canCapture = isReady && (overlayType === "document" ? isDocumentDetected : true)

  if (error) {
    return (
      <div className="flex flex-col flex-1 px-5 py-7">
        <div className="mb-6">
          <h1 className="sv-display mb-2">{title}</h1>
          <p className="sv-lede">{instructions}</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-(--sv-brand-soft)">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sv-brand)" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-(--sv-ink)">Camera Access Required</h2>
          <p className="mb-6 max-w-sm text-center text-sm text-(--sv-ink-3)">{error}</p>
          <button type="button" onClick={() => void startCamera()} className="sv-cta sv-cta-primary max-w-xs">
            <RotateCcw size={16} />
            Retry Camera
          </button>
          <p className="mt-4 max-w-xs text-center text-xs text-(--sv-ink-4)">
            Tip: Make sure no other apps are using your camera
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-4">
      <div className="mb-3">
        <h1 className="mb-1 text-xl font-bold text-(--sv-ink)">{title}</h1>
        <p className="text-sm text-(--sv-ink-3)">{instructions}</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Camera viewport */}
        <div
          ref={videoContainerRef}
          className={cn(
            "sv-scanner relative w-full",
            overlayType === "selfie"
              ? "aspect-square max-w-md"
              : "aspect-3/4 max-h-[70svh] w-full",
          )}
        >
          {/* Scanner grid texture */}
          {!capturedImage && <div className="sv-scanner-grid" />}

          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  facingMode === "user" && "scale-x-[-1]"
                )}
              />

              {/* Document overlay — corner brackets */}
              {overlayType === "document" && (
                <div className="sv-doc-target">
                  <div
                    className={cn(
                      "sv-doc-frame relative transition-colors duration-300",
                      documentAspectRatio >= 1 ? "w-[85%]" : "h-[85%]",
                    )}
                    style={{ aspectRatio: documentAspectRatio }}
                  >
                    <div className={cn("sv-corner tl", isDocumentDetected && "detected")} />
                    <div className={cn("sv-corner tr", isDocumentDetected && "detected")} />
                    <div className={cn("sv-corner bl", isDocumentDetected && "detected")} />
                    <div className={cn("sv-corner br", isDocumentDetected && "detected")} />

                    <span className={cn("sv-scan-hint", isDocumentDetected && "detected")}>
                      {isDocumentDetected ? "Document detected ✓" : "Position document in frame"}
                    </span>
                  </div>
                </div>
              )}

              {/* Selfie overlay — circle ring */}
              {overlayType === "selfie" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={cn(
                      "h-[85%] w-[85%] rounded-full transition-all duration-500",
                      isFaceDetected
                        ? "border-[3px] border-solid border-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.2)]"
                        : isFaceTooClose
                        ? "border-[3px] border-solid border-amber-400 animate-pulse"
                        : "border-[3px] border-dashed border-white/70"
                    )}
                  />
                </div>
              )}

              {/* Flip camera (document only) */}
              {overlayType !== "selfie" && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm touch-manipulation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        {!hideControls && (
          <div className="mt-5 w-full">
            {capturedImage ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="sv-cta sv-cta-ghost flex-1"
                >
                  <RotateCcw size={16} />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={() => onCapture(capturedImage)}
                  className="sv-cta sv-cta-primary flex-1"
                >
                  <Check size={16} />
                  Use Photo
                </button>
              </div>
            ) : (
              <div className="sv-shutter-bar">
                <button
                  type="button"
                  onClick={captureImage}
                  disabled={!canCapture}
                  className="sv-shutter-btn"
                  aria-label={
                    !isReady
                      ? "Starting camera…"
                      : overlayType === "document" && !isDocumentDetected
                      ? "Align document to capture"
                      : "Capture photo"
                  }
                >
                  <div className="sv-shutter-inner" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
