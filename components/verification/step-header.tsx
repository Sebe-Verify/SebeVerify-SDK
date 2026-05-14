"use client"

import { ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerificationStore } from "@/lib/verification-store"
import type { VerificationStep } from "@/lib/verification-store"

interface StepHeaderProps {
  onClose?: () => void
  stepTitle?: string
}

const noHeaderSteps: VerificationStep[] = ["intro", "doc-select"]

export function StepHeader({ onClose, stepTitle }: StepHeaderProps) {
  const { currentStep, goBack } = useVerificationStore()

  if (noHeaderSteps.includes(currentStep)) {
    return null
  }

  const canGoBack =
    currentStep !== "submitted" &&
    currentStep !== "error" &&
    currentStep !== "submitting"

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-3 py-3">
      <div className="w-11 shrink-0">
        {canGoBack && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={goBack}
            className="h-11 w-11 touch-manipulation"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="min-w-0 flex-1 text-center">
        {stepTitle && (
          <span className="text-sm font-semibold text-foreground">{stepTitle}</span>
        )}
      </div>

      <div className="w-11 shrink-0 flex justify-end">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClose}
            className="h-11 w-11 touch-manipulation"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  )
}
