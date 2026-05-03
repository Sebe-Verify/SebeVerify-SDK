import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Identity Verification - SebeVerify",
  description: "Complete your identity verification securely",
}

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
