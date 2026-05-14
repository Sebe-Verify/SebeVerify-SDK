"use client"

import { Info } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

const tips = [
  "Place your ID on a flat surface",
  "Use good, even lighting",
  "Avoid glare and shadows",
  "Keep all four corners visible",
] as const

export function CameraAccessScreen() {
  const setStep = useVerificationStore((s) => s.setStep)

  return (
    <div className="flex flex-col flex-1 px-5 py-7">
      <div className="flex-1">
        <div className="sv-step-pill mb-4">
          <span className="sv-step-pill-num">2</span>
          Scan ID
        </div>

        <h1 className="sv-display mb-2">
          Prepare your document
        </h1>
        <p className="sv-lede mb-7">
          For best results, follow the tips below before opening the camera.
        </p>

        <ul className="sv-prep-list">
          {tips.map((tip, i) => (
            <li key={tip} className="sv-prep-item">
              <span className="sv-prep-num">{i + 1}</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-start gap-2.5 rounded-(--sv-radius-sm) border border-[rgba(44,91,255,0.15)] bg-(--sv-brand-soft) px-3.5 py-3 text-[13px] leading-relaxed text-(--sv-brand-ink)">
          <Info size={16} className="mt-px shrink-0" />
          <span>We&apos;ll request camera access when you continue</span>
        </div>
      </div>

      <div className="pb-[max(8px,env(safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={() => setStep("id-front")}
          className="sv-cta sv-cta-primary"
        >
          Open camera
        </button>
        <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wide text-(--sv-ink-4)">
          Powered by SebeVerify
        </p>
      </div>
    </div>
  )
}
