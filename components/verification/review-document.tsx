"use client"

import { Check, RotateCcw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerificationStore } from "@/lib/verification-store"

export function ReviewDocument() {
  const { documentType, frontImage, backImage, setStep, setFrontImage, setBackImage } = useVerificationStore()

  // Preview must match the actual saved crop: portrait for passports, landscape for IDs
  const previewAspect = documentType === 'passport' ? 0.704 : 1.6

  const handleConfirm = () => {
    setStep('selfie')
  }

  const handleRetakeFront = () => {
    setFrontImage('')
    setStep('id-camera-prep')
  }

  const handleRetakeBack = () => {
    setBackImage('')
    setStep('id-back')
  }

  const tips = [
    "All four corners of the document are visible",
    "Text is clear and readable",
    "No glare or shadows covering important information",
    "The image is not blurry"
  ]

  return (
    <div className="flex flex-col flex-1 px-6 py-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Review your document
        </h1>
        <p className="text-muted-foreground">
          Make sure the images are clear and all information is visible.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {/* Front Image */}
        <div className="relative rounded-xl overflow-hidden border border-border bg-card">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <span className="text-sm font-medium text-foreground">
              {documentType === 'passport' ? 'Photo Page' : 'Front Side'}
            </span>
          </div>
          {frontImage ? (
            <div className="relative flex items-center justify-center bg-muted" style={{ aspectRatio: previewAspect }}>
              <img
                src={frontImage}
                alt="Document front"
                className="h-full w-full object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRetakeFront}
                className="absolute bottom-3 right-3 shadow-md backdrop-blur-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center bg-muted" style={{ aspectRatio: previewAspect }}>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Back Image (only for non-passport) */}
        {documentType !== 'passport' && (
          <div className="relative rounded-xl overflow-hidden border border-border bg-card">
            <div className="px-4 py-2 border-b border-border bg-muted/50">
              <span className="text-sm font-medium text-foreground">Back Side</span>
            </div>
            {backImage ? (
              <div className="relative flex items-center justify-center bg-muted" style={{ aspectRatio: previewAspect }}>
                <img
                  src={backImage}
                  alt="Document back"
                  className="h-full w-full object-contain"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRetakeBack}
                  className="absolute bottom-3 right-3 shadow-md backdrop-blur-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center bg-muted" style={{ aspectRatio: previewAspect }}>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Check that:</h3>
          <ul className="space-y-1.5">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <Button
          onClick={handleConfirm}
          size="xl"
          className="w-full"
          disabled={!frontImage || (documentType !== 'passport' && !backImage)}
        >
          <Check className="h-5 w-5" />
          Looks good, continue
        </Button>
      </div>
    </div>
  )
}
