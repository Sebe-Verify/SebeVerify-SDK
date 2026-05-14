"use client"

import { Lock, Upload } from "lucide-react"

const steps = [
  { label: 'Uploading documents…', delay: 0 },
  { label: 'Encrypting your data…', delay: 700 },
  { label: 'Submitting for review…', delay: 1400 },
]

export function SubmittingScreen() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-10">
      {/* Spinning loader */}
      <div className="sv-loader-wrap mb-8">
        <svg className="sv-loader-ring" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="var(--sv-brand-soft)" strokeWidth="5" />
          <path
            d="M40 4 A36 36 0 0 1 76 40"
            stroke="var(--sv-brand)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <div className="sv-loader-core">
          <Upload size={22} strokeWidth={1.75} />
        </div>
      </div>

      <h1 className="mb-2 text-center text-[22px] font-semibold tracking-tight text-(--sv-ink)">
        Submitting your verification
      </h1>
      <p className="mb-8 text-center text-sm text-(--sv-ink-3)">
        Please wait while we securely upload your data…
      </p>

      {/* Step list */}
      <div className="w-full max-w-xs space-y-3">
        {steps.map(({ label, delay }) => (
          <div
            key={label}
            className="flex animate-in fade-in slide-in-from-bottom-2 items-center gap-3"
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
          >
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--sv-brand)" />
            <span className="text-sm text-(--sv-ink-3)">{label}</span>
          </div>
        ))}
      </div>

      <p className="mt-10 flex max-w-xs items-center justify-center gap-1.5 text-center text-xs text-(--sv-ink-4)">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Your data is being encrypted and securely transmitted.
      </p>
    </div>
  )
}
