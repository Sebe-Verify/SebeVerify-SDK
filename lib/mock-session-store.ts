/**
 * In-memory session store for local development only.
 *
 * Uses a globalThis-anchored Map so the store survives Next.js hot-module
 * reloads in development (the Node.js process is reused). In production
 * serverless environments each function invocation is isolated — mock mode
 * should never be used in production.
 */

export type MockSessionStatus = "pending" | "approved" | "rejected";

export type MockSession = {
  sessionId: string;
  status: MockSessionStatus;
  documentType?: "passport" | "national_id";
  /** Data URLs from camera capture (same as in-app state), not static file paths */
  frontImage?: string;
  backImage?: string;
  selfieImage?: string;
  livenessImages?: string[];
  createdAt: string;
};

// Anchor to globalThis so the Map is not recreated on each hot-reload
const g = globalThis as typeof globalThis & {
  __sebeVerifyMockSessions?: Map<string, MockSession>;
};

if (!g.__sebeVerifyMockSessions) {
  g.__sebeVerifyMockSessions = new Map<string, MockSession>();
}

export function getSessionMap(): Map<string, MockSession> {
  return g.__sebeVerifyMockSessions!;
}

/** Test / dev only */
export function clearMockSessions(): void {
  g.__sebeVerifyMockSessions?.clear();
}
