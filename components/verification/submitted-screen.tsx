"use client"

import { Clock, ArrowRight, Lock } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

interface SubmittedScreenProps {
  onComplete?: () => void
  returnUrl?: string
}

export function SubmittedScreen({ onComplete, returnUrl }: SubmittedScreenProps) {
  const { documentType, submittedAt } = useVerificationStore()

  const handleDone = () => {
    if (onComplete) {
      onComplete()
    } else if (returnUrl) {
      window.location.href = returnUrl
    } else if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  const getDocumentLabel = () => {
    switch (documentType) {
      case 'passport': return 'Passport'
      case 'national_id': return 'National ID'
      case 'driver_license': return "Driver's License"
      default: return 'Document'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-10">
      {/* Icon */}
      <div className="sv-success-icon-wrap mb-6 animate-in zoom-in duration-300">
        <div className="sv-success-halo sv-success-halo-1" />
        <div className="sv-success-halo sv-success-halo-2" />
        <div className="sv-success-icon-core">
          <Clock size={26} strokeWidth={1.75} />
        </div>
      </div>

      <h1 className="mb-2 text-balance text-center text-[22px] font-semibold tracking-tight text-(--sv-ink)">
        Verification in progress
      </h1>
      <p className="mb-8 max-w-sm text-center text-sm leading-relaxed text-(--sv-ink-3)">
        Your documents have been submitted successfully. We&apos;ll notify you once the review is complete.
      </p>

      {/* Receipt card */}
      <div className="sv-receipt mb-6 w-full max-w-sm">
        <div className="sv-receipt-row">
          <span className="sv-receipt-label">Status</span>
          <span className="sv-receipt-value brand flex items-center gap-1.5">
            <Clock size={13} />
            Under Review
          </span>
        </div>
        <div className="sv-receipt-row">
          <span className="sv-receipt-label">Document</span>
          <span className="sv-receipt-value">{getDocumentLabel()}</span>
        </div>
        <div className="sv-receipt-row">
          <span className="sv-receipt-label">Submitted</span>
          <span className="sv-receipt-value">{formatDate(submittedAt)}</span>
        </div>
        <div className="sv-receipt-row">
          <span className="sv-receipt-label">Review time</span>
          <span className="sv-receipt-value">1–2 business days</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDone}
        className="sv-cta sv-cta-primary w-full max-w-sm"
      >
        Done
        <ArrowRight size={18} />
      </button>

      <p className="mt-6 flex max-w-xs items-center justify-center gap-1.5 text-center text-xs text-(--sv-ink-4)">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Your data is encrypted and securely stored.
      </p>
    </div>
  )
}
