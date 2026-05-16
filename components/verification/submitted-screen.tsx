"use client"

import { Inbox, ArrowRight } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

interface SubmittedScreenProps {
  onComplete?: () => void
  returnUrl?: string
}

export function SubmittedScreen({ onComplete, returnUrl }: SubmittedScreenProps) {
  const { submittedAt } = useVerificationStore()

  const handleDone = () => {
    if (onComplete) onComplete()
    else if (returnUrl) window.location.href = returnUrl
    else if (window.history.length > 1) window.history.back()
    else window.location.href = "/"
  }

  const formatSubmittedDate = (iso: string | null) => {
    const d = iso ? new Date(iso) : new Date()
    return (
      d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
      " · " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-(--sv-paper) px-6">
      {/* Status icon — neutral inbox, not a green check */}
      <div className="relative mb-6 h-24 w-24 animate-in zoom-in duration-300">
        <div className="absolute inset-0 rounded-full bg-(--sv-brand-soft) opacity-50" />
        <div className="absolute inset-3 rounded-full bg-(--sv-brand-soft) opacity-70" />
        <div className="absolute inset-4.5 flex items-center justify-center rounded-full bg-(--sv-brand) shadow-[0_4px_20px_rgba(44,91,255,0.35)]">
          <Inbox size={22} color="white" strokeWidth={2} />
        </div>
      </div>

      <h1 className="sv-h1 mb-2 text-center">Submitted for review</h1>
      <p className="sv-lede mb-8 max-w-xs text-center">
        Thanks — we&apos;ve got your details. You&apos;ll hear back as soon as the review is complete.
      </p>

      {/* Status card — honest about what just happened */}
      <div className="mb-8 w-full max-w-sm overflow-hidden rounded-2xl border border-(--sv-hairline) bg-(--sv-card) shadow-(--sv-shadow-card)">
        <div className="flex items-center justify-between border-b border-(--sv-hairline-2) px-4 py-3.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-(--sv-ink-4)">
            Status
          </span>
          <span className="flex items-center gap-2 text-[13px] font-semibold text-(--sv-ink)">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--sv-warning) opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-(--sv-warning)" />
            </span>
            Under review
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-(--sv-ink-4)">
            Submitted
          </span>
          <span className="text-[13px] font-semibold text-(--sv-ink)">
            {formatSubmittedDate(submittedAt)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDone}
        className="sv-cta-arrow w-full max-w-sm"
      >
        <span>Done</span>
        <div className="sv-cta-arrow-chip">
          <ArrowRight size={16} />
        </div>
      </button>
    </div>
  )
}
