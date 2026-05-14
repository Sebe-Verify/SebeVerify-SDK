"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerificationStore } from "@/lib/verification-store"

const tips = [
  "Place your ID on a flat surface",
  "Use good lighting",
  "Avoid glare and shadows",
  "Keep all corners visible",
] as const

export function CameraAccessScreen() {
  const setStep = useVerificationStore((s) => s.setStep)

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background px-6 pb-6 pt-1">
      <div className="flex flex-1 flex-col text-left">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Take a photo of your ID
        </h1>
        <p className="mb-8 text-base text-muted-foreground">
          Make sure all details are clear and readable.
        </p>

        <ul className="mb-10 space-y-3 text-base text-muted-foreground">
          {tips.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <p>We&apos;ll need access to your camera to continue</p>
        </div>
      </div>

      <div className="shrink-0 space-y-6 pt-8">
        <Button
          type="button"
          onClick={() => setStep("id-front")}
          className="w-full touch-manipulation shadow-sm"
          size="xl"
        >
          Enable camera
        </Button>
        <p className="text-center text-xs text-muted-foreground">Powered by SebeVerify</p>
      </div>
    </div>
  )
}
