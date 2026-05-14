"use client"

import { Loader2, Upload, Lock } from "lucide-react"

export function SubmittingScreen() {
  const steps = [
    { label: 'Uploading documents...', delay: 0 },
    { label: 'Encrypting your data...', delay: 800 },
    { label: 'Submitting for review...', delay: 1600 },
  ]

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-8">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <div className="relative">
          <Upload className="h-8 w-8 text-primary" />
          <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-primary" />
        </div>
      </div>

      <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-foreground">
        Submitting your verification
      </h1>

      <p className="mb-8 text-center text-muted-foreground">
        Please wait while we securely upload your data…
      </p>

      <div className="w-full max-w-xs space-y-3">
        {steps.map((step) => (
          <SubmittingStep key={step.label} label={step.label} delay={step.delay} />
        ))}
      </div>

      <p className="mt-8 flex max-w-xs items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Your data is being encrypted and securely transmitted.
      </p>
    </div>
  )
}

function SubmittingStep({ label, delay }: { label: string; delay: number }) {
  return (
    <div
      className="flex animate-in fade-in slide-in-from-bottom-2 items-center gap-3"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
