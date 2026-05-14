"use client"

import { AlertCircle, RotateCcw, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerificationStore } from "@/lib/verification-store"

interface ErrorScreenProps {
  onClose?: () => void
}

export function ErrorScreen({ onClose }: ErrorScreenProps) {
  const { errorMessage, errorDebug, retrySubmission, resetFlow } = useVerificationStore()

  const troubleshootingTips = [
    "Ensure your document is valid and not expired",
    "Use good lighting when taking photos",
    "Make sure your face is clearly visible",
    "Keep the camera steady to avoid blur",
  ]

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-8">
      <div className="mb-6 flex h-24 w-24 animate-in zoom-in items-center justify-center rounded-full bg-destructive/10 duration-300">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>

      <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-foreground">
        Verification failed
      </h1>

      <p className="mb-6 max-w-sm text-center text-muted-foreground">
        {errorMessage || "We couldn't verify your identity. Please try again."}
      </p>

      <div className="mb-8 w-full max-w-sm rounded-lg border border-border bg-muted/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Troubleshooting tips</h3>
        <ul className="space-y-2">
          {troubleshootingTips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 text-primary">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* Resubmits the already-captured images — no re-capture needed */}
        <Button
          onClick={retrySubmission}
          size="xl"
          className="w-full"
        >
          <RefreshCw className="h-5 w-5" />
          Retry submission
        </Button>

        {/* Fallback: start completely over (re-capture documents) */}
        <Button
          onClick={resetFlow}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <RotateCcw className="h-4 w-4" />
          Start over
        </Button>

        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="lg"
            className="w-full"
          >
            Cancel verification
          </Button>
        )}
      </div>

      {errorDebug && (
        <details className="mt-4 w-full max-w-sm">
          <summary className="cursor-pointer select-none text-xs text-muted-foreground">
            Show debug info
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-muted p-3 text-left text-xs whitespace-pre-wrap break-all">
            {errorDebug}
          </pre>
        </details>
      )}

      <p className="mt-6 max-w-xs text-center text-xs text-muted-foreground">
        Need help? Contact support for assistance with verification.
      </p>
    </div>
  )
}
