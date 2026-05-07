/**
 * SebeVerify Web SDK
 * Embeddable identity verification SDK for merchants
 */

const DEFAULT_WEB_APP_URL = "https://sebe-verify-sdk-deploy-fork.vercel.app";

export interface SebeVerifyConfig {
  apiKey: string;
  projectId: string;
  /** Where to send the user after verification finishes (absolute http/https URL) */
  redirectUrl: string;
  /** Override the SebeVerify-hosted web app URL (only needed for self-host / dev / staging) */
  webAppUrl?: string;
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

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "sebeverify-modal-title");
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 20px; padding: 40px;
      max-width: 420px; text-align: center; color: white;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    `;

    const icon = document.createElement("div");
    icon.style.cssText = "font-size: 56px; margin-bottom: 20px;";
    icon.textContent = "🔒";

    const title = document.createElement("h2");
    title.id = "sebeverify-modal-title";
    title.style.cssText = "margin: 0 0 12px; font-size: 24px; font-weight: 600;";
    title.textContent = "Verification Ready";

    const description = document.createElement("p");
    description.style.cssText = "color: #9ca3af; margin: 0 0 32px; line-height: 1.5;";
    description.textContent = "Click below to complete your identity verification";

    const startLink = document.createElement("a");
    startLink.href = verificationUrl;
    startLink.textContent = "Start Verification";
    startLink.style.cssText = `
      display: block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 20px;
    `;

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      background: transparent;
      border: 1px solid #4b5563;
      color: #9ca3af;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    `;

    const footer = document.createElement("div");
    footer.style.cssText = "margin-top: 24px; padding-top: 24px; border-top: 1px solid #374151;";
    const footerText = document.createElement("p");
    footerText.style.cssText = "color: #6b7280; font-size: 12px; margin: 0;";
    footerText.textContent = "You'll be redirected to complete verification";
    footer.appendChild(footerText);

    container.append(icon, title, description, startLink, cancelBtn, footer);
    overlay.appendChild(container);

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
