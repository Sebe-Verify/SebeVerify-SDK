"use client"

import { AlertCircle, RotateCcw, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerificationStore } from "@/lib/verification-store"

interface ErrorScreenProps {
  onRetry?: () => void
  onClose?: () => void
}

export function ErrorScreen({ onRetry, onClose }: ErrorScreenProps) {
  const { errorMessage, errorDebug, resetFlow } = useVerificationStore()

  const handleRetry = () => {
    // resetFlow keeps backendUrl/projectId/apiKey so project mode stays active
    resetFlow()
    if (onRetry) {
      onRetry()
    }
  }

  const troubleshootingTips = [
    "Ensure your document is valid and not expired",
    "Use good lighting when taking photos",
    "Make sure your face is clearly visible",
    "Keep the camera steady to avoid blur"
  ]

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-8">
      <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
        Verification Failed
      </h1>
      
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        {errorMessage || "We couldn't verify your identity. Please try again."}
      </p>

      <div className="w-full max-w-sm p-4 rounded-xl bg-muted/50 border border-border mb-8">
        <h3 className="text-sm font-medium text-foreground mb-3">Troubleshooting Tips</h3>
        <ul className="space-y-2">
          {troubleshootingTips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={handleRetry}
          className="w-full h-12"
          size="lg"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Try Again
        </Button>
        
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-12"
          >
            Cancel Verification
          </Button>
        )}
      </div>

      {errorDebug && (
        <details className="w-full max-w-sm mt-4">
          <summary className="text-xs text-muted-foreground cursor-pointer select-none">
            Show debug info
          </summary>
          <pre className="mt-2 p-3 rounded-lg bg-muted text-xs text-left whitespace-pre-wrap break-all border border-border overflow-auto max-h-48">
            {errorDebug}
          </pre>
        </details>
      )}

      <p className="text-xs text-center text-muted-foreground mt-6 max-w-xs">
        Need help? Contact support for assistance with verification.
      </p>
    </div>
  )
}
