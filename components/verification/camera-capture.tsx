"use client"

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react"
import { RotateCcw, Zap, RefreshCw, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDocumentDetection } from "@/hooks/useDocumentDetection"

let activeGlobalStream: MediaStream | null = null

const killGlobalStream = () => {
  if (activeGlobalStream) {
    activeGlobalStream.getTracks().forEach(t => { t.enabled = false; t.stop() })
    activeGlobalStream = null
  }
}

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onRetake?: () => void
  capturedImage?: string | null
  title: string
  instructions: ReactNode
  overlayType?: "document" | "selfie"
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
    if (videoRef?.current) videoRef.current.srcObject = null
    killGlobalStream()
    setStream(null)
    setIsReady(false)
  }, [videoRef])

  const isRequestingRef = useRef(false)

  const startCamera = useCallback(async (overrideFacing?: "user" | "environment") => {
    if (isRequestingRef.current) return
    const mode = overrideFacing ?? facingMode
    try {
      isRequestingRef.current = true
      setError(null)

      if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
        setError("Camera needs HTTPS. Open the app URL over HTTPS or use localhost.")
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not available in this browser. Try Safari or Chrome with HTTPS.")
        return
      }

      killGlobalStream()
      setStream(null)

      let mediaStream: MediaStream | null = null
      let attempts = 0
      let lastError: unknown = null

      while (attempts < 6) {
        try {
          await new Promise(r => setTimeout(r, attempts === 0 ? 300 : 800))
          const focusConstraint = { focusMode: "continuous", advanced: [{ focusMode: "continuous" }] } as unknown as MediaTrackConstraints
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 }, ...focusConstraint },
            audio: false,
          })
          try {
            const [track] = mediaStream.getVideoTracks()
            if (track && "applyConstraints" in track) await track.applyConstraints(focusConstraint)
          } catch { /* not supported */ }
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
        mediaStream.getTracks().forEach(t => t.stop())
        return
      }
      activeGlobalStream = mediaStream
      setStream(mediaStream)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if (e.name === "AbortError" || e.message.includes("Timeout")) {
        setError("Camera took too long to start. Close other apps using the camera and try again.")
      } else if (e.name === "NotAllowedError") {
        setError("Camera access was denied. Enable camera in your browser settings and try again.")
      } else if (e.name === "NotFoundError") {
        setError("No camera found on this device.")
      } else {
        setError(`Cannot access camera (${e.name}). Check permissions and try again.`)
      }
    } finally {
      isRequestingRef.current = false
    }
  }, [facingMode])

  useEffect(() => () => { stopCamera() }, [stopCamera])

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => setIsReady(true)
      videoRef.current.onplay = () => setIsReady(true)
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (overlayType === "document") {
      const container = videoContainerRef.current
      const vw = video.videoWidth, vh = video.videoHeight
      let visW: number, visH: number, visX: number, visY: number
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        const srcA = vw / vh, dstA = container.clientWidth / container.clientHeight
        if (srcA > dstA) { visH = vh; visW = vh * dstA; visX = (vw - visW) / 2; visY = 0 }
        else { visW = vw; visH = vw / dstA; visX = 0; visY = (vh - visH) / 2 }
      } else { visW = vw; visH = vh; visX = 0; visY = 0 }
      const isPortrait = documentAspectRatio < 1
      let gw = isPortrait ? visH * 0.85 * documentAspectRatio : visW * 0.85
      let gh = gw / documentAspectRatio
      if (gh > visH * 0.85) { gh = visH * 0.85; gw = gh * documentAspectRatio }
      if (gw > visW * 0.85) { gw = visW * 0.85; gh = gw / documentAspectRatio }
      canvas.width = Math.round(gw); canvas.height = Math.round(gh)
      ctx.drawImage(video, visX + (visW - gw) / 2, visY + (visH - gh) / 2, gw, gh, 0, 0, canvas.width, canvas.height)
      onCapture(canvas.toDataURL("image/jpeg", 1.0))
    } else {
      const MAX_WIDTH = 480
      const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1
      canvas.width = video.videoWidth * scale; canvas.height = video.videoHeight * scale
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      onCapture(canvas.toDataURL("image/jpeg", 0.7))
    }
    stopCamera()
  }, [overlayType, onCapture, stopCamera, documentAspectRatio])

  const [hasAutoStarted, setHasAutoStarted] = useState(false)
  useEffect(() => {
    if (!hasAutoStarted && !capturedImage) { setHasAutoStarted(true); void startCamera() }
  }, [hasAutoStarted, capturedImage, startCamera])

  const toggleCamera = () => {
    const next = facingMode === "user" ? "environment" : "user"
    setFacingMode(next); void startCamera(next)
  }

  const canCapture = isReady && (overlayType === "document" ? isDocumentDetected : true)

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col flex-1 bg-(--sv-paper) px-5 py-8 items-center justify-center">
        <div className="mb-4 w-16 h-16 rounded-2xl bg-(--sv-brand-soft) flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--sv-brand)" strokeWidth="1.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-(--sv-ink) mb-2 text-center">Camera access required</h2>
        <p className="text-sm text-(--sv-ink-3) text-center mb-6 max-w-xs">{error}</p>
        <button type="button" onClick={() => void startCamera()} className="w-full max-w-xs h-14 rounded-2xl bg-(--sv-brand) text-white font-semibold flex items-center justify-center gap-2">
          <RotateCcw size={16} /> Retry
        </button>
      </div>
    )
  }

  // ── Selfie mode ────────────────────────────────────────────────────────────
  if (overlayType === "selfie") {
    return (
      <div className="flex flex-col flex-1 bg-(--sv-paper) px-4 py-4">
        <p className="text-sm text-(--sv-ink-3) mb-3 text-center">{instructions}</p>
        <div className="flex flex-1 flex-col items-center justify-center">
          <div
            ref={videoContainerRef}
            className="relative aspect-square w-full max-w-md overflow-hidden rounded-full bg-black"
          >
            {capturedImage ? (
              <img src={capturedImage} alt="Captured" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" />
            )}
            {/* Ring overlay */}
            <div className={cn(
              "absolute inset-0 rounded-full border-[3px] transition-all duration-500",
              isFaceDetected
                ? "border-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.2)]"
                : isFaceTooClose
                ? "border-amber-400 animate-pulse"
                : "border-white/50 border-dashed"
            )} />
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── Document capture mode (screens 4 & 5) ─────────────────────────────────
  return (
    <div className="flex flex-col flex-1 bg-(--sv-paper)">
      {/* Instructions above camera */}
      <div className="px-5 pt-3 pb-2">
        <p className="text-[13px] text-(--sv-ink-3) text-center">{instructions}</p>
      </div>

      {/* Camera viewport */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div
          ref={videoContainerRef}
          className="relative w-full overflow-hidden rounded-2xl bg-black"
          style={{ aspectRatio: documentAspectRatio >= 1 ? "4/3" : "3/4", maxHeight: "62svh" }}
        >
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />

              {/* Document guide frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    "relative rounded-xl border-2 transition-all duration-300",
                    documentAspectRatio >= 1 ? "w-[88%]" : "h-[88%]",
                    isDocumentDetected ? "border-green-500" : "border-white/70"
                  )}
                  style={{ aspectRatio: documentAspectRatio }}
                >
                  {/* Corner accents */}
                  {[
                    "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                    "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                    "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                    "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
                  ].map((cls, i) => (
                    <div
                      key={i}
                      className={cn(
                        "absolute w-6 h-6 border-transparent transition-colors duration-300",
                        cls,
                        isDocumentDetected ? "border-green-500" : "border-white"
                      )}
                    />
                  ))}

                  {/* Status pill */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-300",
                      isDocumentDetected
                        ? "bg-green-500 text-white"
                        : "bg-black/50 text-white/80 backdrop-blur-sm"
                    )}>
                      {isDocumentDetected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {isDocumentDetected ? "Document detected" : "Position document in frame"}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom bar */}
      {!hideControls && (
        <div className="px-5 pb-4 pt-4">
          {capturedImage ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { onRetake?.(); void startCamera() }}
                className="flex-1 h-14 rounded-2xl border-2 border-(--sv-hairline) bg-(--sv-card) text-(--sv-ink) font-semibold flex items-center justify-center gap-2 text-[14px]"
              >
                <RotateCcw size={16} /> Retake
              </button>
              <button
                type="button"
                onClick={() => onCapture(capturedImage)}
                className="flex-1 h-14 rounded-2xl bg-(--sv-brand) text-white font-semibold flex items-center justify-center gap-2 text-[14px]"
              >
                <Check size={16} /> Use Photo
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Flash placeholder */}
              <button
                type="button"
                className="w-12 h-12 rounded-2xl border border-(--sv-hairline) bg-(--sv-card) flex items-center justify-center text-(--sv-ink-3) touch-manipulation"
                aria-label="Flash"
              >
                <Zap size={18} />
              </button>

              {/* Center status pill / tap to capture */}
              <button
                type="button"
                onClick={captureImage}
                disabled={!canCapture}
                className={cn(
                  "flex-1 h-12 rounded-2xl flex items-center justify-center text-[13px] font-semibold transition-all touch-manipulation",
                  canCapture
                    ? "bg-(--sv-brand) text-white shadow-[0_4px_12px_rgba(44,91,255,0.3)]"
                    : "border border-(--sv-hairline) bg-(--sv-card) text-(--sv-ink-4)"
                )}
              >
                {!isReady ? "Starting…" : isDocumentDetected ? "Tap to capture" : "Detecting…"}
              </button>

              {/* Flip camera */}
              <button
                type="button"
                onClick={toggleCamera}
                className="w-12 h-12 rounded-2xl border border-(--sv-hairline) bg-(--sv-card) flex items-center justify-center text-(--sv-ink-3) touch-manipulation"
                aria-label="Flip camera"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
