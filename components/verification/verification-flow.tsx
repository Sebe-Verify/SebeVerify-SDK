"use client";

import { useEffect } from "react";
import { useVerificationStore } from "@/lib/verification-store";

import { StepHeader } from "./step-header";
import { ProgressBar } from "./progress-bar";
import { IntroScreen } from "./intro-screen";
import { DocumentTypeSelector } from "./document-type-selector";
import { CameraAccessScreen } from "./camera-access-screen";
import { IdFrontCapture, IdBackCapture } from "./id-capture";
import { ReviewDocument } from "./review-document";
import { SelfieCapture } from "./selfie-capture";
import { SubmittingScreen } from "./submitting-screen";
import { SubmittedScreen } from "./submitted-screen";
import { ErrorScreen } from "./error-screen";

import { LivenessProvider, useLiveness } from "./liveness-context";

interface VerificationFlowProps {
  onComplete?: () => void;
  onClose?: () => void;
  returnUrl?: string;
  /** When true (desktop UA), show QR + URL on intro so users can open the flow on a phone */
  showHandoffQr?: boolean;
  qrCodeImageUrl?: string;
  verifyPageUrl?: string;
}

function VerificationFlowInner({
  onComplete,
  onClose,
  returnUrl,
  showHandoffQr,
  qrCodeImageUrl,
  verifyPageUrl,
}: VerificationFlowProps) {
  const currentStep = useVerificationStore((state) => state.currentStep);
  const { initLivenessEngine } = useLiveness();

  // Eager Pre-loading: Start booting the AI as soon as the user starts the ID flow
  useEffect(() => {
    if (["id-front", "id-back", "review"].includes(currentStep)) {
      initLivenessEngine();
    }
  }, [currentStep, initLivenessEngine]);

  const renderStep = () => {
    switch (currentStep) {
      case "intro":
        return (
          <IntroScreen
            showHandoffQr={showHandoffQr}
            qrCodeImageUrl={qrCodeImageUrl}
            verifyPageUrl={verifyPageUrl}
          />
        );
      case "doc-select":
        return <DocumentTypeSelector />;
      case "id-camera-prep":
        return <CameraAccessScreen />;
      case "id-front":
        return <IdFrontCapture />;
      case "id-back":
        return <IdBackCapture />;
      case "review":
        return <ReviewDocument />;
      case "selfie":
        return <SelfieCapture />;
      case "submitting":
        return <SubmittingScreen />;
      case "submitted":
        return (
          <SubmittedScreen onComplete={onComplete} returnUrl={returnUrl} />
        );
      case "error":
        return <ErrorScreen onClose={onClose} />;
      default:
        return (
          <IntroScreen
            showHandoffQr={showHandoffQr}
            qrCodeImageUrl={qrCodeImageUrl}
            verifyPageUrl={verifyPageUrl}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <StepHeader onClose={onClose} />
      <ProgressBar currentStep={currentStep} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {renderStep()}
      </main>
    </div>
  );
}

export function VerificationFlow(props: VerificationFlowProps) {
  return (
    <LivenessProvider>
      <VerificationFlowInner {...props} />
    </LivenessProvider>
  );
}
