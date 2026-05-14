"use client"

import { ArrowLeft, X } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"
import type { VerificationStep } from "@/lib/verification-store"

interface StepHeaderProps {
  onClose?: () => void
  stepTitle?: string
}

const noHeaderSteps: VerificationStep[] = ["intro"]

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
    <header className="sv-topbar">
      <div>
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="sv-topbar-btn"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
      </div>

      <div className="sv-topbar-title">
        {stepTitle ?? ""}
      </div>

      <div className="flex justify-end">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="sv-topbar-btn"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
