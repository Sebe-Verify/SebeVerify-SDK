"use client"

import { ArrowRight } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

const tips = [
  "Place your document on a flat, dark surface",
  "Make sure the lighting is even — no glare or shadows",
  "Keep all four corners inside the frame",
  "Hold steady — we'll capture automatically",
] as const

export function CameraAccessScreen() {
  const setStep = useVerificationStore((s) => s.setStep)

  return (
    <div className="flex flex-col flex-1 bg-(--sv-paper)">
      <div className="flex-1 px-5 pt-6 pb-4">
        <h1 className="sv-h1 mb-6">
          A few things<br />before we start.
        </h1>

        {/* Numbered tip rows */}
        <div className="rounded-2xl border border-(--sv-hairline) bg-(--sv-card) overflow-hidden">
          {tips.map((tip, i) => (
            <div
              key={tip}
              className="flex items-start gap-4 px-4 py-4 border-b border-(--sv-hairline-2) last:border-b-0"
            >
              <span className="font-mono text-[11px] font-semibold text-(--sv-ink-4) mt-0.5 w-5 shrink-0 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[14px] text-(--sv-ink-2) leading-snug">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={() => setStep("id-front")}
          className="sv-cta-arrow w-full"
        >
          <span>Open camera</span>
          <div className="sv-cta-arrow-chip">
            <ArrowRight size={16} />
          </div>
        </button>
      </div>
    </div>
  )
}
