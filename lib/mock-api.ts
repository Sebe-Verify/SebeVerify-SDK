/**
 * Server-side mock session API. Used by Next.js route handlers.
 * For browser calls, use `lib/mock-api-client.ts` (fetch wrappers).
 */

import type { MockSession } from "./mock-session-store"
import { getSessionMap } from "./mock-session-store"

export function createSession(verificationBaseUrl: string): {
  sessionId: string
  verificationUrl: string
} {
  const sessionId = `sess_${crypto.randomUUID()}`
  const createdAt = new Date().toISOString()
  const session: MockSession = {
    sessionId,
    status: "pending",
    createdAt,
  }
  getSessionMap().set(sessionId, session)

  const base = verificationBaseUrl.replace(/\/$/, "")
  const verificationUrl = `${base}/verify/${sessionId}`

  return { sessionId, verificationUrl }
}

export function getSession(sessionId: string): MockSession | undefined {
  return getSessionMap().get(sessionId)
}

export function updateSession(
  sessionId: string,
  data: Partial<Omit<MockSession, "sessionId">>
): MockSession | undefined {
  const map = getSessionMap()
  const existing = map.get(sessionId)
  if (!existing) return undefined
  const next: MockSession = {
    ...existing,
    ...data,
    sessionId,
  }
  map.set(sessionId, next)
  return next
}

export function completeSession(sessionId: string): {
  success: boolean
  status?: "approved"
} {
  const updated = updateSession(sessionId, { status: "approved" })
  if (!updated) return { success: false }
  return { success: true, status: "approved" }
}
