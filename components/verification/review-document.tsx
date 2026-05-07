"use client"

import { Check, RotateCcw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerificationStore } from "@/lib/verification-store"

export function ReviewDocument() {
  const { documentType, frontImage, backImage, setStep, setFrontImage, setBackImage } = useVerificationStore()

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
        <h1 className="text-xl font-bold text-foreground mb-2">
          Review Your Document
        </h1>
        <p className="text-muted-foreground">
          Make sure the images are clear and all information is visible
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
            <div className="relative aspect-[1.6]">
              <img
                src={frontImage}
                alt="Document front"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleRetakeFront}
                className="absolute bottom-3 right-3 h-10 px-4 rounded-lg bg-background/90 backdrop-blur-sm flex items-center gap-2 text-sm font-medium text-foreground shadow-lg"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </button>
            </div>
          ) : (
            <div className="aspect-[1.6] flex items-center justify-center bg-muted">
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
              <div className="relative aspect-[1.6]">
                <img
                  src={backImage}
                  alt="Document back"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRetakeBack}
                  className="absolute bottom-3 right-3 h-10 px-4 rounded-lg bg-background/90 backdrop-blur-sm flex items-center gap-2 text-sm font-medium text-foreground shadow-lg"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </button>
              </div>
            ) : (
              <div className="aspect-[1.6] flex items-center justify-center bg-muted">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <h3 className="text-sm font-medium text-foreground mb-2">Check that:</h3>
          <ul className="space-y-1.5">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <Button
          onClick={handleConfirm}
          className="w-full h-12"
          size="lg"
          disabled={!frontImage || (documentType !== 'passport' && !backImage)}
        >
          <Check className="h-5 w-5 mr-2" />
          Looks Good, Continue
        </Button>
      </div>
    </div>
  )
}
