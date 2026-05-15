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
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.022em] text-(--sv-ink) mb-6">
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
      <div className="px-5 pb-5 pt-2">
        <button
          type="button"
          onClick={() => setStep("id-front")}
          className="w-full h-14 rounded-2xl bg-(--sv-brand) text-white text-[15px] font-semibold flex items-center justify-between px-5 shadow-[0_4px_16px_rgba(44,91,255,0.3)] active:scale-[0.98] transition-transform touch-manipulation"
        >
          <span>Open camera</span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowRight size={16} />
          </div>
        </button>
      </div>
    </div>
  )
}
