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
      projectId: null as string | null,
      apiKey: null as string | null,
    };
  const params = new URLSearchParams(window.location.search);
  return {
    session: params.get("session"),
    returnUrl: params.get("returnUrl") || params.get("return_url"),
    projectId: params.get("projectId"),
    apiKey: params.get("apiKey"),
  };
}

/**
 * Validates that a returnUrl is a safe absolute HTTP/HTTPS URL.
 * Rejects relative paths, javascript: URIs, and malformed values.
 */
function isValidReturnUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function buildRedirectUrl(
  returnUrl: string,
  status: string,
  sessionId: string | null,
): string {
  const url = new URL(returnUrl);
  url.searchParams.set("status", status);
  if (sessionId) url.searchParams.set("session", sessionId);
  return url.toString();
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
  const reset = useVerificationStore((state) => state.reset);
  const backendSessionId = useVerificationStore((state) => state.backendSessionId);

  useEffect(() => {
    const {
      session,
      returnUrl: r,
      projectId,
      apiKey,
    } = readQuery();
    const sid = sessionIdFromPath || session;

    // Clear all state from any previous verification attempt before wiring up the new session.
    reset();

    setSessionIdState(sid ?? null);

    // Only accept returnUrl values that are safe absolute HTTP/HTTPS URLs
    if (isValidReturnUrl(r)) {
      setReturnUrl(r);
    }

    if (sid) setSessionId(sid);
    setApiConfig({
      projectId: projectId || undefined,
      apiKey: apiKey || undefined,
    });
  }, [sessionIdFromPath, reset, setApiConfig, setSessionId]);

  const handleComplete = () => {
    if (isValidReturnUrl(returnUrl)) {
      // Prefer backendSessionId — it's what the webhook sends as meta_data.session_id.
      // Fall back to the client-side UUID for mock mode where there's no real backend session.
      const sid = backendSessionId || sessionId;
      window.location.href = buildRedirectUrl(returnUrl, "success", sid);
    } else {
      // No returnUrl — just go back or to the root
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    }
  };

  const handleClose = () => {
    if (isValidReturnUrl(returnUrl)) {
      window.location.href = buildRedirectUrl(returnUrl, "cancelled", sessionId);
    } else {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
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
      />
    </VerifyRouteGate>
  );
}
