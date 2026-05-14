"use client"

import { ArrowRight, Check } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

interface SubmittedScreenProps {
  onComplete?: () => void
  returnUrl?: string
}

function generateRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
  let s = "SV-"
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function SubmittedScreen({ onComplete, returnUrl }: SubmittedScreenProps) {
  const { submittedAt } = useVerificationStore()

  const handleDone = () => {
    if (onComplete) onComplete()
    else if (returnUrl) window.location.href = returnUrl
    else if (window.history.length > 1) window.history.back()
    else window.location.href = "/"
  }

  const formatVerifiedDate = (iso: string | null) => {
    const d = iso ? new Date(iso) : new Date()
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
      " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  const ref = generateRef()

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-(--sv-paper) px-6">
      {/* Success icon */}
      <div className="relative w-24 h-24 mb-6 animate-in zoom-in duration-300">
        {/* Outer halo */}
        <div className="absolute inset-0 rounded-full bg-(--sv-brand-soft) opacity-50" />
        {/* Inner halo */}
        <div className="absolute inset-3 rounded-full bg-(--sv-brand-soft) opacity-70" />
        {/* Core */}
        <div className="absolute inset-4.5 rounded-full bg-(--sv-brand) flex items-center justify-center shadow-[0_4px_20px_rgba(44,91,255,0.35)]">
          <Check size={22} color="white" strokeWidth={2.5} />
        </div>
      </div>

      <h1 className="text-[30px] font-bold tracking-tight text-(--sv-ink) mb-2 text-center">
        You&apos;re verified.
      </h1>
      <p className="text-[14px] text-(--sv-ink-3) text-center mb-8 max-w-xs leading-relaxed">
        All set. A copy of your receipt is in your inbox.
      </p>

      {/* Receipt */}
      <div className="w-full max-w-sm rounded-2xl border border-(--sv-hairline) bg-(--sv-card) overflow-hidden shadow-(--sv-shadow-card) mb-8">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-(--sv-hairline-2)">
          <span className="font-mono text-[10px] uppercase tracking-widest text-(--sv-ink-4)">Reference</span>
          <span className="text-[14px] font-semibold text-(--sv-ink)">{ref}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-(--sv-ink-4)">Verified</span>
          <span className="text-[14px] font-semibold text-(--sv-ink)">{formatVerifiedDate(submittedAt)}</span>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleDone}
        className="w-full max-w-sm h-14 rounded-2xl bg-(--sv-brand) text-white text-[15px] font-semibold flex items-center justify-between px-5 shadow-[0_4px_16px_rgba(44,91,255,0.3)] active:scale-[0.98] transition-transform touch-manipulation"
      >
        <span>Continue</span>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
          <ArrowRight size={16} />
        </div>
      </button>
    </div>
  )
}
