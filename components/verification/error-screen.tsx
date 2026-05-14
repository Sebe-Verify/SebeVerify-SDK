"use client"

import { AlertCircle, RotateCcw, RefreshCw } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

interface ErrorScreenProps {
  onClose?: () => void
}

const troubleshootingTips = [
  "Ensure your document is valid and not expired",
  "Use good lighting when taking photos",
  "Make sure your face is clearly visible",
  "Keep the camera steady to avoid blur",
]

export function ErrorScreen({ onClose }: ErrorScreenProps) {
  const { errorMessage, errorDebug, retrySubmission, resetFlow } = useVerificationStore()

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-10">
      {/* Icon */}
      <div className="mb-6 animate-in zoom-in duration-300">
        <div className="flex h-22 w-22 items-center justify-center rounded-full bg-[rgba(239,68,68,0.1)]">
          <AlertCircle size={44} color="var(--sv-error)" strokeWidth={1.75} />
        </div>
      </div>

      <h1 className="mb-2 text-center text-[22px] font-semibold tracking-tight text-(--sv-ink)">
        Verification failed
      </h1>
      <p className="mb-6 max-w-sm text-center text-sm text-(--sv-ink-3)">
        {errorMessage || "We couldn't verify your identity. Please try again."}
      </p>

      {/* Tips */}
      <div className="sv-receipt mb-8 w-full max-w-sm">
        {troubleshootingTips.map((tip) => (
          <div key={tip} className="sv-receipt-row gap-2.5">
            <span className="text-(--sv-brand) leading-none">•</span>
            <span className="sv-receipt-label">{tip}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={retrySubmission}
          className="sv-cta sv-cta-primary"
        >
          <RefreshCw size={18} />
          Retry submission
        </button>

        <button
          type="button"
          onClick={resetFlow}
          className="sv-cta sv-cta-ghost"
        >
          <RotateCcw size={16} />
          Start over
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="sv-cta sv-cta-text"
          >
            Cancel verification
          </button>
        )}
      </div>

      {errorDebug && (
        <details className="mt-6 w-full max-w-sm">
          <summary className="cursor-pointer select-none text-xs text-(--sv-ink-4)">
            Show debug info
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-(--sv-hairline) bg-(--sv-paper-2) p-3 text-left text-xs whitespace-pre-wrap break-all">
            {errorDebug}
          </pre>
        </details>
      )}
    </div>
  )
}
