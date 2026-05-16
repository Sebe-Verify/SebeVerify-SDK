"use client"

import { ArrowRight } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

export function IntroScreen() {
  const setStep = useVerificationStore((state) => state.setStep)

  return (
    <div className="flex flex-col flex-1 bg-(--sv-paper)">
      {/* Top bar */}
      <div className="flex items-center justify-center py-3">
        <span className="text-[15px] font-semibold text-(--sv-ink-2)">Identity check</span>
      </div>

      {/* Illustration area */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pt-8 pb-4">
        {/* SVG illustration — two layered ID cards with a checkmark */}
        <div className="mb-10 w-64 h-44 relative select-none" aria-hidden>
          {/* Background halo */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full bg-[rgba(44,91,255,0.07)]" />

          {/* Back card — white/light */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-52 h-32 rounded-2xl bg-white border border-[rgba(0,0,0,0.08)] shadow-[0_4px_24px_rgba(0,0,0,0.08)] rotate-[-4deg] origin-bottom">
            <div className="absolute left-4 top-4 w-8 h-10 rounded-md bg-[#d0ccc0]" />
            <div className="absolute right-4 top-5 space-y-2">
              <div className="w-24 h-2 rounded-full bg-[#e0ddd5]" />
              <div className="w-20 h-2 rounded-full bg-[#e0ddd5]" />
              <div className="w-16 h-2 rounded-full bg-[#e0ddd5]" />
            </div>
          </div>

          {/* Front card — brand blue */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-52 h-32 rounded-2xl bg-(--sv-brand) shadow-[0_8px_32px_rgba(44,91,255,0.35)] rotate-[3deg] origin-bottom">
            <div className="absolute left-4 top-4 w-9 h-11 rounded-md bg-[rgba(255,255,255,0.25)]" />
            <div className="absolute right-4 top-5 space-y-2">
              <div className="w-24 h-2 rounded-full bg-[rgba(255,255,255,0.4)]" />
              <div className="w-20 h-2 rounded-full bg-[rgba(255,255,255,0.4)]" />
              <div className="w-14 h-2 rounded-full bg-[rgba(255,255,255,0.4)]" />
            </div>
          </div>

          {/* Checkmark badge */}
          <div className="absolute bottom-2 right-14 w-10 h-10 rounded-full bg-(--sv-ink) flex items-center justify-center shadow-lg">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9l3.5 3.5L14 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h1 className="sv-h1-lg mb-3 w-full text-left">
          Verify your identity in{" "}
          <span className="text-(--sv-ink-4)">about</span>{" "}
          two minutes.
        </h1>

        {/* Subtext */}
        <p className="sv-lede w-full text-left">
          A quick, secure check. We&apos;ll guide you the whole way.
        </p>
      </div>

      {/* Bottom action */}
      <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={() => setStep("doc-select")}
          className="sv-cta-arrow w-full"
        >
          <span>Begin verification</span>
          <div className="sv-cta-arrow-chip">
            <ArrowRight size={16} />
          </div>
        </button>
      </div>
    </div>
  )
}
