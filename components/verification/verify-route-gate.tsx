"use client"

import { useEffect, useState, type ReactNode } from "react"

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS|EdgiOS/i

type VerifyRouteGateProps = {
  /** From server User-Agent so the first paint is not an endless spinner on phones */
  initialMobileFlow: boolean
  verifyPageUrl: string
  qrCodeImageUrl: string
  children: ReactNode
}

/**
 * Desktop vs phone is refined on the client. Server hint avoids a blank loading state on mobile.
 */
export function VerifyRouteGate({
  initialMobileFlow,
  verifyPageUrl,
  qrCodeImageUrl,
  children,
}: VerifyRouteGateProps) {
  const [showFlow, setShowFlow] = useState(initialMobileFlow)

  useEffect(() => {
    const checkMobile = () => {
      // 1. Check for strict mobile user agents
      const uaMobile = MOBILE_UA.test(navigator.userAgent)
      // 2. Check for physical touch hardware (iPad/Tablets sometimes miss UA string)
      const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)

      // Only allow flow if it's a PROVABLE mobile device (or dev tools spoofing one)
      // Prevent desktop users from simply "resizing" their window to bypass the lock!
      setShowFlow(uaMobile && hasTouch)
    }
    checkMobile()
  }, [])

  if (!showFlow) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Continue on Mobile</h2>
          <p className="mb-6 text-gray-500">
            Access to a high-quality smartphone camera is required to securely capture your identity documents.
          </p>
          <div className="mb-6 flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50 p-6">
            {qrCodeImageUrl ? (
              <img
                src={qrCodeImageUrl}
                alt=""
                className="mb-4 h-40 w-40 rounded-xl shadow-sm"
              />
            ) : null}
            <p className="text-sm font-medium text-gray-700">Scan to open on your phone</p>
          </div>
          {verifyPageUrl ? (
            <p className="mb-2 break-all text-xs text-muted-foreground">
              {verifyPageUrl}
            </p>
          ) : null}
          <p className="text-xs text-gray-400">Powered by SebeVerify</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
