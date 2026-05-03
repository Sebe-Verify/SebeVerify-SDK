import { VerifyPageClient } from "./verify-page-client"
import { buildVerifyPageUrls } from "@/lib/verify-urls"
import { getInitialMobileFlow } from "@/lib/mobile-detect"

type SearchParams = {
  session?: string
  returnUrl?: string
  return_url?: string
  backendUrl?: string
  projectId?: string
  apiKey?: string
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const initialMobileFlow = await getInitialMobileFlow()

  const { qrCodeImageUrl, verifyPageUrl } = await buildVerifyPageUrls({
    sessionId: params.session,
    returnUrl: params.returnUrl || params.return_url,
    backendUrl: params.backendUrl,
    projectId: params.projectId,
    apiKey: params.apiKey,
  })

  return (
    <VerifyPageClient
      initialMobileFlow={initialMobileFlow}
      qrCodeImageUrl={qrCodeImageUrl}
      verifyPageUrl={verifyPageUrl}
    />
  )
}