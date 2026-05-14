"use client";

import { ShieldCheck, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationStore } from "@/lib/verification-store";

const trustBadges = [
  { icon: Lock, label: "Encrypted" },
  { icon: ShieldCheck, label: "GDPR compliant" },
  { icon: Clock, label: "~2 minutes" },
] as const;

export function IntroScreen() {
  const setStep = useVerificationStore((state) => state.setStep);

  const goToDocSelect = () => {
    setStep("doc-select");
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center px-6 pb-6 pt-10 text-center">
        <div
          className="mb-10 flex items-center justify-center gap-2"
          role="presentation"
          aria-label="Step 1 of 2"
        >
          <span className="h-1.5 w-10 rounded-full bg-primary" />
          <span className="h-1.5 w-10 rounded-full bg-muted" />
        </div>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
        </div>

        <h1 className="mb-3 max-w-[18rem] text-2xl font-semibold tracking-tight text-foreground">
          Verify your identity
        </h1>

        <p className="max-w-xs text-base leading-relaxed text-muted-foreground">
          A quick, secure check to protect your account and prevent fraud.
        </p>
      </div>

      <div className="mt-auto w-full border-t border-border/40 bg-background px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <Button
          type="button"
          size="xl"
          onClick={goToDocSelect}
          className="w-full touch-manipulation shadow-sm"
        >
          Start verification
        </Button>

        <div className="mt-5 flex items-center justify-center gap-5">
          {trustBadges.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </span>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Powered by SebeVerify
        </p>
      </div>
    </div>
  );
}
