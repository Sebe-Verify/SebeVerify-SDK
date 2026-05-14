"use client"

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react"
import { Camera, RotateCcw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
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
}: CameraCaptureProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    overlayType === "selfie" ? "user" : "environment"
  )

  const detectionEnabled = overlayType === "document" && !capturedImage && isReady
  const { isDocumentDetected } = useDocumentDetection({ videoRef, enabled: detectionEnabled, aspectRatio: documentAspectRatio })

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
            // Spread it via a generic-typed object so TS doesn't object.
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

            // Some phones (esp. iOS) need an explicit applyConstraints to actually engage continuous focus
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
            if (
              name === "NotReadableError" ||
              name === "TrackStartError" ||
              name === "AbortError"
            ) {
              attempts++
            } else {
              throw err
            }
          }
        }

        if (!mediaStream) {
          throw lastError
        }

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
    return () => {
      stopCamera()
    }
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
      // Crop to guide rectangle at full native resolution — no downscale, no compression loss
      const vw = video.videoWidth
      const vh = video.videoHeight
      const isPortrait = documentAspectRatio < 1
      // For portrait docs (passport), base the guide on 75% of the shorter video dimension
      const gw = isPortrait
        ? Math.min(vw, vh) * 0.75 * documentAspectRatio
        : vw * 0.85
      const gh = gw / documentAspectRatio
      const gx = (vw - gw) / 2
      const gy = (vh - gh) / 2

      canvas.width = Math.round(gw)
      canvas.height = Math.round(gh)
      context.drawImage(video, gx, gy, gw, gh, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL("image/jpeg", 1.0)
      onCapture(imageData)
    } else {
      // Selfie path: 480px max, mirrored, 70% quality
      const MAX_WIDTH = 480
      const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1
      canvas.width = video.videoWidth * scale
      canvas.height = video.videoHeight * scale
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL("image/jpeg", 0.7)
      onCapture(imageData)
    }

    stopCamera()
  }, [overlayType, onCapture, stopCamera])

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
      <div className="flex flex-col flex-1 px-6 py-6">
        <div className="mb-6">
          <h1 className="mb-2 text-xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{instructions}</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <Camera className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Camera Access Required</h2>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">{error}</p>
          <Button type="button" onClick={() => void startCamera()} size="lg" className="h-12 px-8">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Camera
          </Button>
          <p className="mt-4 max-w-xs text-center text-xs text-muted-foreground">
            Tip: Make sure no other apps are using your camera
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-4">
      <div className="mb-3">
        <h1 className="mb-1 text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{instructions}</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-2xl bg-black",
            overlayType === "selfie"
              ? "aspect-square max-w-md"
              : "min-h-[300px] flex-1",
          )}
        >
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

              {/* Document overlay: corner-bracket frame */}
              {overlayType === "document" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={cn(
                      "relative transition-all duration-300",
                      documentAspectRatio >= 1 ? "w-[85%]" : "h-[85%]",
                      isDocumentDetected ? "text-green-500" : "text-white/80"
                    )}
                    style={{ aspectRatio: documentAspectRatio }}
                  >
                    {/* Semi-transparent border for general framing */}
                    <div className={cn(
                      "absolute inset-0 rounded-lg border transition-all duration-300",
                      isDocumentDetected
                        ? "border-green-500/60 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
                        : "border-white/20"
                    )} />

                    {/* Corner brackets */}
                    <div className="absolute left-0 top-0 h-7 w-7 border-l-[3px] border-t-[3px] border-current rounded-tl-md" />
                    <div className="absolute right-0 top-0 h-7 w-7 border-r-[3px] border-t-[3px] border-current rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-current rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-current rounded-br-md" />

                    {/* Status label inside frame */}
                    <div className="absolute inset-x-0 bottom-3 flex justify-center">
                      <span className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm transition-all duration-300",
                        isDocumentDetected
                          ? "bg-green-500/90 text-white"
                          : "bg-black/50 text-white/80"
                      )}>
                        {isDocumentDetected ? "Document detected ✓" : "Position document in frame"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selfie overlay: circle fills 85% of the 1:1 container */}
              {overlayType === "selfie" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={cn(
                      "h-[85%] w-[85%] rounded-full transition-all duration-500",
                      isFaceDetected
                        ? "border-[3px] border-solid border-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.2)]"
                        : "border-[3px] border-dashed border-white/70"
                    )}
                  />
                </div>
              )}

              {/* Flip camera button (document only) */}
              {!capturedImage && overlayType !== "selfie" && (
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

        <div className="mt-4 space-y-3">
          {!hideControls && (capturedImage ? (
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleRetake}
                variant="outline"
                className="h-12 flex-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                type="button"
                onClick={() => onCapture(capturedImage)}
                className="h-12 flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                Use Photo
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={captureImage}
              disabled={!canCapture}
              className="h-14 w-full text-base font-semibold"
              size="lg"
            >
              <Camera className="mr-2 h-5 w-5" />
              {!isReady
                ? "Starting camera…"
                : overlayType === "document" && !isDocumentDetected
                ? "Align document to capture"
                : "Capture"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
