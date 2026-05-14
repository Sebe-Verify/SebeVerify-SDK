"use client"

import { Check, RotateCcw, AlertCircle } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"
import { cn } from "@/lib/utils"

export function ReviewDocument() {
  const { documentType, frontImage, backImage, setStep, setFrontImage, setBackImage } = useVerificationStore()

  // aspect-[w/h]: portrait for passports (0.704 ≈ 50/71), landscape for IDs (1.6 = 8/5)
  const isPassport = documentType === 'passport'
  const aspectClass = isPassport ? "aspect-[50/71]" : "aspect-[8/5]"

  const handleConfirm = () => setStep('selfie')
  const handleRetakeFront = () => { setFrontImage(''); setStep('id-camera-prep') }
  const handleRetakeBack = () => { setBackImage(''); setStep('id-back') }

  const tips = [
    "All four corners of the document are visible",
    "Text is clear and readable",
    "No glare or shadows covering important information",
    "The image is not blurry",
  ]

  return (
    <div className="flex flex-col flex-1 px-5 py-6">
      <div className="mb-6">
        <h1 className="sv-display mb-2">Review your document</h1>
        <p className="sv-lede">
          Make sure the images are clear and all information is visible.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {/* Front image */}
        <div className="overflow-hidden rounded-(--sv-radius-md) border border-(--sv-hairline) bg-(--sv-card) shadow-(--sv-shadow-card)">
          <div className="border-b border-(--sv-hairline-2) bg-(--sv-paper-2) px-4 py-2">
            <span className="text-sm font-semibold text-(--sv-ink)">
              {isPassport ? 'Photo Page' : 'Front Side'}
            </span>
          </div>
          <div className={cn("relative flex items-center justify-center bg-(--sv-paper-2)", aspectClass)}>
            {frontImage ? (
              <>
                <img src={frontImage} alt="Document front" className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={handleRetakeFront}
                  className="sv-cta sv-cta-ghost absolute bottom-3 right-3 h-8 w-auto gap-1.5 px-3 text-xs"
                >
                  <RotateCcw size={13} />
                  Retake
                </button>
              </>
            ) : (
              <AlertCircle size={32} color="var(--sv-ink-4)" />
            )}
          </div>
        </div>

        {/* Back image — non-passport only */}
        {!isPassport && (
          <div className="overflow-hidden rounded-(--sv-radius-md) border border-(--sv-hairline) bg-(--sv-card) shadow-(--sv-shadow-card)">
            <div className="border-b border-(--sv-hairline-2) bg-(--sv-paper-2) px-4 py-2">
              <span className="text-sm font-semibold text-(--sv-ink)">Back Side</span>
            </div>
            <div className={cn("relative flex items-center justify-center bg-(--sv-paper-2)", aspectClass)}>
              {backImage ? (
                <>
                  <img src={backImage} alt="Document back" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={handleRetakeBack}
                    className="sv-cta sv-cta-ghost absolute bottom-3 right-3 h-8 w-auto gap-1.5 px-3 text-xs"
                  >
                    <RotateCcw size={13} />
                    Retake
                  </button>
                </>
              ) : (
                <AlertCircle size={32} color="var(--sv-ink-4)" />
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="rounded-(--sv-radius-sm) border border-[rgba(44,91,255,0.18)] bg-(--sv-brand-soft) p-4">
          <h3 className="mb-2 text-sm font-semibold text-(--sv-ink)">Check that:</h3>
          <ul className="space-y-1.5">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-(--sv-ink-2)">
                <Check size={15} className="mt-0.5 shrink-0 text-(--sv-brand)" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!frontImage || (!isPassport && !backImage)}
          className="sv-cta sv-cta-primary"
        >
          <Check size={18} />
          Looks good, continue
        </button>
      </div>
    </div>
  )
}
