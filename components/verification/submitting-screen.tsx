"use client"

import { Lock } from "lucide-react"

export function SubmittingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-(--sv-paper) px-6">
      {/* Spinner */}
      <div className="relative mb-8 h-24 w-24">
        <svg
          className="absolute inset-0 h-full w-full animate-spin"
          viewBox="0 0 96 96"
          fill="none"
          style={{ animationDuration: "1.4s" }}
        >
          <circle cx="48" cy="48" r="42" stroke="var(--sv-brand-soft)" strokeWidth="5" />
          <path
            d="M48 6 A42 42 0 0 1 90 48"
            stroke="var(--sv-brand)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--sv-brand-soft)">
            <Lock size={22} color="var(--sv-brand)" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      <h1 className="sv-h1 mb-2 text-center">Reviewing your details</h1>
      <p className="sv-lede mb-8 max-w-xs text-center">
        Securely uploading and checking your documents. This usually takes under a minute.
      </p>

      {/* Indeterminate progress bar — communicates "in progress" without faking step structure */}
      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-(--sv-hairline)">
        <div className="sv-indeterminate-bar absolute inset-y-0 w-1/3 rounded-full bg-(--sv-brand)" />
      </div>
    </div>
  )
}
