/**
 * SebeVerify Web SDK
 * Embeddable identity verification SDK for merchants
 */

const DEFAULT_WEB_APP_URL = "https://sebe-verify-sdk.vercel.app";

export interface SebeVerifyConfig {
  apiKey: string;
  projectId: string;
  /** Where to send the user after verification finishes (absolute http/https URL) */
  redirectUrl: string;
  /** Override the SebeVerify-hosted web app URL (only needed for self-host / dev / staging) */
  webAppUrl?: string;
  /**
   * Absolute URL the SDK will POST `{ sessionId }` to before opening the
   * verification flow. Use this to register the session on your backend so
   * webhooks can be linked back to the current user. The request includes
   * browser cookies (credentials: "include"), so any session-cookie auth on
   * your endpoint works automatically.
   */
  registerSessionUrl?: string;
}

export interface SebeVerifyResult {
  sessionId: string;
  status: "submitted" | "failed" | "cancelled" | "pending";
  submissionData?: {
    documentType: string;
    submittedAt: string;
    message: string;
  };
  requestId?: string;
}

type EventType = "started" | "mobile_opened" | "error" | "cancelled";
type EventCallback = (data?: SebeVerifyResult | Error) => void;

function assertAbsoluteHttpUrl(value: string, field: string): void {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute http(s) URL, got "${value}"`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`${field} must be an http(s) URL, got "${u.protocol}"`);
  }
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback for browsers without crypto.randomUUID (Safari < 15.4)
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

class SebeVerifySDK {
  private config: SebeVerifyConfig;
  private eventListeners: Map<EventType, EventCallback[]> = new Map();
  private sessionId: string | null = null;
  private modalElement: HTMLDivElement | null = null;
  private webAppUrl: string;

  constructor(config: SebeVerifyConfig) {
    if (!config.apiKey) throw new Error("apiKey is required");
    if (!config.projectId) throw new Error("projectId is required");
    if (!config.redirectUrl) throw new Error("redirectUrl is required");
    assertAbsoluteHttpUrl(config.redirectUrl, "redirectUrl");

    const webAppUrl = config.webAppUrl || DEFAULT_WEB_APP_URL;
    assertAbsoluteHttpUrl(webAppUrl, "webAppUrl");

    this.config = config;
    this.webAppUrl = webAppUrl.replace(/\/$/, "");
  }

  on(event: EventType, callback: EventCallback): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    return this;
  }

  off(event: EventType, callback: EventCallback): this {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
    return this;
  }

  private emit(event: EventType, data?: SebeVerifyResult | Error): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in ${event} handler:`, e);
      }
    });
  }

  private buildVerificationUrl(sessionId: string): string {
    const qs = new URLSearchParams({
      returnUrl: this.config.redirectUrl,
      projectId: this.config.projectId,
      apiKey: this.config.apiKey,
    });
    return `${this.webAppUrl}/verify/${sessionId}?${qs.toString()}`;
  }

  private createModal(verificationUrl: string): void {
    if (this.modalElement) return;

    // Inject Geist font if not already on the page
    if (!document.getElementById("sv-geist-font")) {
      const link = document.createElement("link");
      link.id = "sv-geist-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500&display=swap";
      document.head.appendChild(link);
    }

    const font = "'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif";

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "sebeverify-modal-title");
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      background: rgba(14,19,34,0.5);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      font-family: ${font};
      -webkit-font-smoothing: antialiased;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      background: #FAFAF6;
      background-image: radial-gradient(ellipse 90% 50% at 50% -5%, rgba(44,91,255,0.07) 0%, transparent 70%);
      border-radius: 26px;
      padding: 32px 28px 28px;
      width: 100%; max-width: 400px;
      box-shadow: 0 1px 0 rgba(14,19,34,0.02), 0 24px 48px -12px rgba(14,19,34,0.22);
      border: 1px solid #E7E6E0;
      text-align: center;
    `;

    // Icon
    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = `
      width: 72px; height: 72px; border-radius: 50%;
      background: #ECF0FF;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    `;
    iconWrap.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2C5BFF" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    // Title
    const title = document.createElement("h2");
    title.id = "sebeverify-modal-title";
    title.style.cssText = `
      margin: 0 0 8px; padding: 0;
      font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;
      color: #0E1322; font-family: ${font};
    `;
    title.textContent = "Identity Verification";

    // Description
    const description = document.createElement("p");
    description.style.cssText = `
      margin: 0 0 24px; padding: 0;
      font-size: 14px; line-height: 1.55; color: #8B8F9C; font-family: ${font};
    `;
    description.textContent = "Verify your identity to continue. You'll need your ID document and a selfie — takes about 2 minutes.";

    // Info strip
    const infoStrip = document.createElement("div");
    infoStrip.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      background: #FFFFFF; border: 1px solid #E7E6E0; border-radius: 12px;
      padding: 11px 14px; margin-bottom: 20px; text-align: left;
      box-shadow: 0 1px 0 rgba(14,19,34,0.02), 0 4px 8px -4px rgba(14,19,34,0.08);
    `;
    infoStrip.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C5BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style="font-size:13px;color:#4B5063;font-family:${font};">ID document &amp; selfie · ~2 min</span>
    `;

    // CTA button
    const startLink = document.createElement("a");
    startLink.href = verificationUrl;
    startLink.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      height: 56px; padding: 0 20px; margin-bottom: 10px;
      background: #2C5BFF; color: #fff; text-decoration: none;
      border-radius: 18px; font-family: ${font};
      font-size: 15px; font-weight: 600; letter-spacing: -0.01em;
      box-shadow: 0 4px 16px rgba(44,91,255,0.3);
      transition: background 0.15s;
    `;
    startLink.innerHTML = `
      <span>Start Verification</span>
      <span style="
        display:flex;align-items:center;justify-content:center;
        width:32px;height:32px;border-radius:12px;
        background:rgba(255,255,255,0.2);flex-shrink:0;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    `;
    startLink.addEventListener("mouseover", () => { startLink.style.background = "#0F36D9"; });
    startLink.addEventListener("mouseout", () => { startLink.style.background = "#2C5BFF"; });

    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      display: flex; align-items: center; justify-content: center;
      width: 100%; height: 40px; margin-bottom: 20px;
      background: transparent; border: none;
      color: #8B8F9C; font-family: ${font};
      font-size: 13px; font-weight: 500; cursor: pointer;
      transition: color 0.15s;
    `;
    cancelBtn.addEventListener("mouseover", () => { cancelBtn.style.color = "#4B5063"; });
    cancelBtn.addEventListener("mouseout", () => { cancelBtn.style.color = "#8B8F9C"; });

    // Footer divider + trust line
    const footer = document.createElement("div");
    footer.style.cssText = `
      padding-top: 16px; border-top: 1px solid #E7E6E0;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    `;
    footer.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C2C5CE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span style="font-size:11px;color:#C2C5CE;font-family:'Geist Mono',ui-monospace,monospace;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;">Secured by SebeVerify</span>
    `;

    card.append(iconWrap, title, description, infoStrip, startLink, cancelBtn, footer);
    overlay.appendChild(card);

    const close = () => {
      this.closeModal();
      this.emit("cancelled");
    };

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeydown);
    (overlay as HTMLDivElement & { __cleanup?: () => void }).__cleanup = () => {
      document.removeEventListener("keydown", onKeydown);
    };

    document.body.appendChild(overlay);
    this.modalElement = overlay;
  }

  private closeModal(): void {
    if (!this.modalElement) return;
    const cleanup = (this.modalElement as HTMLDivElement & { __cleanup?: () => void }).__cleanup;
    if (cleanup) cleanup();
    this.modalElement.remove();
    this.modalElement = null;
  }

  private isMobile(): boolean {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  async start(): Promise<void> {
    try {
      this.emit("started");

      const sessionId = generateUuid();
      this.sessionId = sessionId;

      if (this.config.registerSessionUrl) {
        const res = await fetch(this.config.registerSessionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(
            body.error ?? `Session registration failed (${res.status})`,
          );
        }
      }

      const verificationUrl = this.buildVerificationUrl(sessionId);

      if (this.isMobile()) {
        window.location.href = verificationUrl;
        this.emit("mobile_opened");
        return;
      }

      this.createModal(verificationUrl);
    } catch (error) {
      this.closeModal();
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.emit("error", new Error(errorMessage));
      throw error;
    }
  }

  destroy(): void {
    this.closeModal();
    this.eventListeners.clear();
    this.sessionId = null;
  }
}

export default function init(config: SebeVerifyConfig): SebeVerifySDK {
  return new SebeVerifySDK(config);
}

export { SebeVerifySDK };

/**
 * Optional server-side helper for Next.js API routes that want to bootstrap a
 * backend session before redirecting the user. Most merchants don't need this —
 * the embedded SDK handles session creation automatically.
 */
export interface CreateVerificationSessionOptions {
  apiKey: string;
  projectId: string;
  backendUrl: string;
  documentType?: string;
  documentId?: string;
}

export interface CreateVerificationSessionResult {
  sessionId: string;
  backendUrl: string;
  projectId: string;
}

export async function createVerificationSession(
  config: CreateVerificationSessionOptions,
): Promise<CreateVerificationSessionResult> {
  const documentType = config.documentType || "national-id";
  const documentId =
    config.documentId ||
    `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const url = `${config.backendUrl}/projects/${config.projectId}/verification/session/start`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({
      document_type: documentType,
      document_id: documentId,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to create verification session" }));
    const errorDetail =
      typeof error?.detail === "string"
        ? error.detail
        : JSON.stringify(error?.detail ?? error);
    throw new Error(
      `${errorDetail || "Failed to create verification session"} (${response.status})`,
    );
  }

  const data = (await response.json()) as { session_id: string };

  return {
    sessionId: data.session_id,
    backendUrl: config.backendUrl,
    projectId: config.projectId,
  };
}
