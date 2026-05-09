/**
 * Browser-side fetch helpers for the mock API. Swap URLs for real endpoints later.
 */

import type { MockSession } from "./mock-session-store"

const jsonHeaders = { "Content-Type": "application/json" }

export async function apiUpdateMockSession(
  sessionId: string,
  data: Partial<Omit<MockSession, "sessionId">>
): Promise<MockSession | null> {
  const res = await fetch(`/api/mock/session/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`updateSession failed: ${res.status}`)
  return res.json()
}

export async function apiCompleteMockSession(sessionId: string): Promise<{
  success: boolean
  status?: "approved"
}> {
  const res = await fetch(
    `/api/mock/session/${encodeURIComponent(sessionId)}/complete`,
    { method: "POST", headers: jsonHeaders }
  )
  if (!res.ok) throw new Error(`completeSession failed: ${res.status}`)
  return res.json()
}

/** True when this session should sync to the mock API (sess_ prefix from mock create) */
export function isMockSessionId(sessionId: string | null): boolean {
  return Boolean(sessionId?.startsWith("sess_"))
}
