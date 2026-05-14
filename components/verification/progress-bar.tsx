"use client"

import type { VerificationStep } from "@/lib/verification-store"

interface ProgressBarProps {
  currentStep: VerificationStep
}

const dotSteps: VerificationStep[] = [
  'doc-select',
  'id-front',
  'selfie',
  'submitting',
]

const stepOrder: VerificationStep[] = [
  'intro',
  'doc-select',
  'id-camera-prep',
  'id-front',
  'id-back',
  'review',
  'selfie',
  'submitting',
  'submitted',
  'error'
]

export function ProgressBar({ currentStep }: ProgressBarProps) {
  if (currentStep === 'intro' || currentStep === 'submitted' || currentStep === 'error') {
    return null
  }

  const currentIndex = stepOrder.indexOf(currentStep)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 16px 2px' }}>
      <div className="sv-dots">
        {dotSteps.map((step) => {
          const stepIndex = stepOrder.indexOf(step)
          const isDone = currentIndex > stepIndex
          const isActive =
            currentIndex === stepIndex ||
            (step === 'id-front' && (currentStep === 'id-camera-prep' || currentStep === 'id-back' || currentStep === 'review'))

          return (
            <div
              key={step}
              className={`sv-dot${isActive ? ' active' : isDone ? ' done' : ''}`}
            />
          )
        })}
      </div>
    </div>
  )
}
