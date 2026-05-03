"use client";

import { useVerificationStore } from "@/lib/verification-store";

interface IntroScreenProps {
  /** Desktop-only: scan QR to continue on another device */
  showHandoffQr?: boolean;
  qrCodeImageUrl?: string;
  verifyPageUrl?: string;
}

export function IntroScreen({
  showHandoffQr = false,
  qrCodeImageUrl,
  verifyPageUrl,
}: IntroScreenProps) {
  const setStep = useVerificationStore((state) => state.setStep);

  const goToDocSelect = () => {
    setStep("doc-select");
  };

  const handoffReady =
    showHandoffQr && qrCodeImageUrl && verifyPageUrl;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center px-6 pb-6 pt-10 text-center">
        {showHandoffQr ? (
          <>
            <div className="relative mb-10 flex justify-center">
              {qrCodeImageUrl ? (
                <img
                  src={qrCodeImageUrl}
                  alt="Scan to verify on mobile"
                  className="h-40 w-40 rounded-xl shadow-sm"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  QR code could not be generated
                </p>
              )}
            </div>

            <div
              className="mb-10 flex items-center justify-center gap-2"
              role="presentation"
              aria-label="Step 1 of 2"
            >
              <span className="h-2 w-10 rounded-full bg-primary" />
              <span className="h-2 w-10 rounded-full bg-muted" />
            </div>

            {handoffReady ? (
              <div className="mb-6 max-w-xs">
                <p className="mb-2 text-sm text-muted-foreground">
                  Scan to continue on mobile
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {verifyPageUrl}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <div
            className="mb-10 flex items-center justify-center gap-2"
            role="presentation"
            aria-label="Step 1 of 2"
          >
            <span className="h-2 w-10 rounded-full bg-primary" />
            <span className="h-2 w-10 rounded-full bg-muted" />
          </div>
        )}

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
