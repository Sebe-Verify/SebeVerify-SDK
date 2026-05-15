"use client"

import { Lock } from "lucide-react"

export function SubmittingScreen() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-(--sv-paper) px-6">
      {/* Spinner */}
      <div className="relative w-24 h-24 mb-8">
        {/* Spinning arc */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
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
        {/* Lock icon centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-(--sv-brand-soft) flex items-center justify-center">
            <Lock size={22} color="var(--sv-brand)" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      <h1 className="text-[28px] font-bold tracking-tight text-(--sv-ink) mb-2 text-center">
        Uploading…
      </h1>
      <p className="text-[14px] text-(--sv-ink-3) text-center mb-8">
        Sending to verification servers
      </p>

      {/* Three-dot step indicator — middle dot is active wide pill */}
      <div className="flex items-center gap-2 mb-10">
        {/* dot 1 — inactive small */}
        <div className="w-2 h-2 rounded-full bg-(--sv-ink-4)" />
        {/* dot 2 — active wide pill */}
        <div className="w-8 h-2 rounded-full bg-(--sv-brand)" />
        {/* dot 3 — inactive small */}
        <div className="w-2 h-2 rounded-full bg-(--sv-ink-4)" />
      </div>

    </div>
  )
}
