"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ShieldCheck, Lock } from "lucide-react"

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
      const uaMobile = MOBILE_UA.test(navigator.userAgent)
      const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
      setShowFlow(uaMobile && hasTouch)
    }
    checkMobile()
  }, [])

  if (!showFlow) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
            Continue on your phone
          </h2>
          <p className="mb-6 text-muted-foreground">
            A smartphone camera is required to securely capture your identity documents.
          </p>
          <div className="mb-6 flex flex-col items-center rounded-xl border border-border bg-muted/40 p-6">
            {qrCodeImageUrl ? (
              <img
                src={qrCodeImageUrl}
                alt=""
                className="mb-4 h-40 w-40 rounded-lg"
              />
            ) : null}
            <p className="text-sm font-medium text-foreground">Scan to open on your phone</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Encrypted handoff
            </span>
          </div>
          {verifyPageUrl ? (
            <p className="mb-2 break-all text-xs text-muted-foreground">
              {verifyPageUrl}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground/70">Powered by SebeVerify</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
