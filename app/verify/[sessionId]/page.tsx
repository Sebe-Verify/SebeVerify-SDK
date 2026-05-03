import { VerifyPageClient } from "../verify-page-client";
import { buildVerifyPageUrls } from "@/lib/verify-urls";
import { getInitialMobileFlow } from "@/lib/mobile-detect";

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    returnUrl?: string;
    return_url?: string;
    backendUrl?: string;
    projectId?: string;
    apiKey?: string;
  }>;
};

export default async function VerifySessionPage({
  params,
  searchParams,
}: Props) {
  const { sessionId } = await params;
  const resolvedParams = await searchParams;
  const initialMobileFlow = await getInitialMobileFlow();

  const { qrCodeImageUrl, verifyPageUrl } = await buildVerifyPageUrls({
    sessionId,
    returnUrl: resolvedParams.returnUrl || resolvedParams.return_url,
    backendUrl: resolvedParams.backendUrl,
    projectId: resolvedParams.projectId,
    apiKey: resolvedParams.apiKey,
  });

  return (
    <VerifyPageClient
      initialMobileFlow={initialMobileFlow}
      sessionIdFromPath={sessionId}
      qrCodeImageUrl={qrCodeImageUrl}
      verifyPageUrl={verifyPageUrl}
    />
  );
}
