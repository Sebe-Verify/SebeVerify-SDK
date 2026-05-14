"use client"

import { Lock } from "lucide-react"

const PHASES = [
  { label: "Uploading documents", delay: 0 },
  { label: "Encrypting data", delay: 900 },
  { label: "Sending for review", delay: 1800 },
]

export function SubmittingScreen() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-(--sv-paper) px-6">
      {/* Spinner */}
      <div className="relative w-20 h-20 mb-8">
        {/* Spinning arc */}
        <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 80 80" fill="none" style={{ animationDuration: "1.2s" }}>
          <circle cx="40" cy="40" r="34" stroke="var(--sv-brand-soft)" strokeWidth="5" />
          <path
            d="M40 6 A34 34 0 0 1 74 40"
            stroke="var(--sv-brand)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        {/* Lock icon center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-(--sv-brand-soft) flex items-center justify-center">
            <Lock size={20} color="var(--sv-brand)" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-(--sv-ink) mb-2 text-center">
        Uploading…
      </h1>
      <p className="text-[14px] text-(--sv-ink-3) text-center mb-8">
        Sending to verification servers
      </p>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-10">
        {PHASES.map(({ label, delay }, i) => (
          <div
            key={label}
            className="w-2 h-2 rounded-full animate-pulse bg-(--sv-brand)"
            style={{ animationDelay: `${delay}ms`, opacity: i === 1 ? 1 : 0.4 }}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-(--sv-ink-4)">
        Secured by <span className="font-semibold">SebeVerify</span>
      </p>
    </div>
  )
}
