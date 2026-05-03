"use client";

import { useEffect, useState } from "react";
import { VerificationFlow } from "@/components/verification/verification-flow";
import { VerifyRouteGate } from "@/components/verification/verify-route-gate";
import { useVerificationStore } from "@/lib/verification-store";

function readQuery() {
  if (typeof window === "undefined")
    return {
      session: null as string | null,
      returnUrl: null as string | null,
      backendUrl: null as string | null,
      sessionToken: null as string | null,
      projectId: null as string | null,
      apiKey: null as string | null,
    };
  const params = new URLSearchParams(window.location.search);
  return {
    session: params.get("session"),
    returnUrl: params.get("returnUrl") || params.get("return_url"),
    backendUrl: params.get("backendUrl"),
    sessionToken: params.get("sessionToken"),
    projectId: params.get("projectId"),
    apiKey: params.get("apiKey"),
  };
}

type VerifyPageClientProps = {
  /** Server User-Agent hint for desktop vs mobile gate */
  initialMobileFlow: boolean;
  /** From `/verify/[sessionId]` — preferred over `?session=` */
  sessionIdFromPath?: string;
  qrCodeImageUrl?: string;
  verifyPageUrl?: string;
};

export function VerifyPageClient({
  initialMobileFlow,
  sessionIdFromPath,
  qrCodeImageUrl,
  verifyPageUrl,
}: VerifyPageClientProps) {
  const [sessionId, setSessionIdState] = useState<string | null>(
    sessionIdFromPath ?? null,
  );
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const setSessionId = useVerificationStore((state) => state.setSessionId);
  const setApiConfig = useVerificationStore((state) => state.setApiConfig);

  useEffect(() => {
    const {
      session,
      returnUrl: r,
      backendUrl,
      sessionToken,
      projectId,
      apiKey,
    } = readQuery();
    const sid = sessionIdFromPath || session;
    setSessionIdState(sid);
    setReturnUrl(r);
    if (sid) setSessionId(sid);
    setApiConfig({
      backendUrl: backendUrl || undefined,
      sessionToken: sessionToken || undefined,
      projectId: projectId || undefined,
      apiKey: apiKey || undefined,
    });
  }, [sessionIdFromPath, setApiConfig, setSessionId]);

  const handleComplete = () => {
    if (returnUrl) {
      window.location.href = `${returnUrl}?status=success&session=${sessionId}`;
    }
  };

  const handleClose = () => {
    if (returnUrl) {
      window.location.href = `${returnUrl}?status=cancelled&session=${sessionId}`;
    }
  };

  return (
    <VerifyRouteGate
      initialMobileFlow={initialMobileFlow}
      verifyPageUrl={verifyPageUrl ?? ""}
      qrCodeImageUrl={qrCodeImageUrl ?? ""}
    >
      <VerificationFlow
        onComplete={handleComplete}
        onClose={handleClose}
        returnUrl={returnUrl || undefined}
        qrCodeImageUrl={qrCodeImageUrl}
        verifyPageUrl={verifyPageUrl}
      />
    </VerifyRouteGate>
  );
}
