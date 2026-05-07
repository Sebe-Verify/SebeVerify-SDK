"use client";

import { useVerificationStore } from "@/lib/verification-store";

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
          <span className="h-2 w-10 rounded-full bg-primary" />
          <span className="h-2 w-10 rounded-full bg-muted" />
        </div>

        <h1 className="mb-3 max-w-[18rem] text-3xl font-bold tracking-tight text-foreground">
          Verify your identity
        </h1>

        <p className="max-w-xs text-base leading-relaxed text-muted-foreground">
          This helps protect your account and prevent fraud
        </p>
      </div>

      <div className="mt-auto w-full border-t border-border/40 bg-background px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={goToDocSelect}
          className="h-14 w-full touch-manipulation rounded-2xl bg-blue-600 text-white text-base font-medium shadow-sm transition-all active:bg-blue-700"
        >
          Start verification
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Powered by SebeVerify
        </p>
      </div>
    </div>
  );
}
