"use client"

import { ArrowRight } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"
import type { DocumentType } from "@/lib/verification-store"
import { cn } from "@/lib/utils"

const documentTypes: {
  type: DocumentType
  label: string
  photos: string
  time: string
  illustration: "id" | "passport"
}[] = [
  { type: "national_id", label: "National ID Card", photos: "2 photos", time: "~30 sec", illustration: "id" },
  { type: "passport",    label: "Passport",          photos: "1 photo",  time: "~20 sec", illustration: "passport" },
]

function DocIllustration({ type }: { type: "id" | "passport" }) {
  if (type === "passport") {
    return (
      <div className="w-full h-full rounded-lg bg-[#1a1a2e] flex flex-col justify-between p-2">
        <div className="w-10 h-3 rounded-sm bg-white/20" />
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full bg-white/15" />
          <div className="w-3/4 h-1.5 rounded-full bg-white/15" />
        </div>
      </div>
    )
  }
  return (
    <div className="w-full h-full rounded-lg flex items-center gap-2 p-2 bg-(--sv-brand)">
      <div className="w-6 h-7 rounded-sm bg-white/25 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="w-full h-1.5 rounded-full bg-white/30" />
        <div className="w-5/6 h-1.5 rounded-full bg-white/30" />
        <div className="w-4/6 h-1.5 rounded-full bg-white/30" />
      </div>
    </div>
  )
}

export function DocumentTypeSelector() {
  const { documentType, setDocumentType } = useVerificationStore()

  const selected: DocumentType = documentType ?? "national_id"

  const handleContinue = () => {
    setDocumentType(selected)
    useVerificationStore.getState().setStep("id-camera-prep")
  }

  return (
    <div className="flex flex-col flex-1 bg-(--sv-paper)">
      <div className="flex-1 px-5 pt-6 pb-4">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.022em] text-(--sv-ink) mb-1.5">
          Which document<br />are you using?
        </h1>
        <p className="text-sm text-(--sv-ink-3) mb-6">
          Pick one to verify. Must be valid and not expired.
        </p>

        {/* Document radio cards */}
        <div className="space-y-2.5 mb-3">
          {documentTypes.map(({ type, label, photos, time, illustration }) => {
            const isSelected = selected === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setDocumentType(type)}
                className={cn(
                  "w-full flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all duration-150 text-left bg-(--sv-card)",
                  isSelected
                    ? "border-(--sv-brand) shadow-[0_0_0_3px_rgba(44,91,255,0.12)]"
                    : "border-(--sv-hairline) hover:border-[#ccc]"
                )}
              >
                {/* Illustration */}
                <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0">
                  <DocIllustration type={illustration} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-(--sv-ink) leading-tight">{label}</div>
                  <div className="text-[12px] text-(--sv-ink-4) mt-0.5">
                    {photos} · {time}
                  </div>
                </div>

                {/* Radio indicator */}
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  isSelected
                    ? "border-(--sv-brand) bg-(--sv-brand)"
                    : "border-(--sv-ink-4) bg-transparent"
                )}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-5 pt-2">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full h-14 rounded-2xl bg-(--sv-brand) text-white text-[15px] font-semibold flex items-center justify-between px-5 shadow-[0_4px_16px_rgba(44,91,255,0.3)] active:scale-[0.98] transition-transform touch-manipulation"
        >
          <span>Continue</span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowRight size={16} />
          </div>
        </button>
      </div>
    </div>
  )
}
