"use client";

import { ShieldCheck, Lock, Clock } from "lucide-react";
import { useVerificationStore } from "@/lib/verification-store";

export function IntroScreen() {
  const setStep = useVerificationStore((state) => state.setStep);

  return (
    <div className="flex flex-col flex-1">
      {/* Welcome art area */}
      <div className="flex flex-1 flex-col items-center justify-center px-7 pb-6 pt-10 text-center">
        {/* Illustration */}
        <div className="mb-7 flex h-28 w-28 items-center justify-center rounded-[28px] bg-(--sv-brand-soft) shadow-[0_0_0_16px_rgba(44,91,255,0.05)]">
          <ShieldCheck size={52} color="var(--sv-brand)" strokeWidth={1.5} />
        </div>

        <h1 className="sv-display mb-3 max-w-70">
          Verify your identity
        </h1>

        <p className="sv-lede max-w-70">
          A quick, secure check to protect your account and prevent fraud.
        </p>

        {/* Step rows */}
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
          {[
            { num: '1', label: 'Scan your document' },
            { num: '2', label: 'Take a selfie' },
            { num: '3', label: 'Submit for review' },
          ].map(({ num, label }) => (
            <div
              key={num}
              className="flex items-center gap-3 rounded-(--sv-radius-sm) border border-(--sv-hairline) bg-(--sv-card) px-3.5 py-2.5 shadow-(--sv-shadow-card)"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--sv-brand) font-mono text-[11px] font-semibold text-white">
                {num}
              </div>
              <span className="text-sm font-medium text-(--sv-ink-2)">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action area */}
      <div className="border-t border-(--sv-hairline-2) bg-[rgba(250,250,246,0.9)] px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setStep("doc-select")}
          className="sv-cta sv-cta-primary"
        >
          Start verification
        </button>

        <div className="sv-trust-row mt-4">
          <span className="sv-trust-chip">
            <Lock size={13} />
            Encrypted
          </span>
          <span className="sv-trust-chip">
            <ShieldCheck size={13} />
            GDPR compliant
          </span>
          <span className="sv-trust-chip">
            <Clock size={13} />
            ~2 minutes
          </span>
        </div>

        <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wide text-(--sv-ink-4)">
          Powered by SebeVerify
        </p>
      </div>
    </div>
  );
}
