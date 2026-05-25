/**
 * SebeVerify Web SDK
 * Embeddable identity verification SDK for merchants
 */
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
declare class SebeVerifySDK {
    private config;
    private eventListeners;
    private sessionId;
    private modalElement;
    private webAppUrl;
    constructor(config: SebeVerifyConfig);
    on(event: EventType, callback: EventCallback): this;
    off(event: EventType, callback: EventCallback): this;
    private emit;
    private buildVerificationUrl;
    private createModal;
    private closeModal;
    private isMobile;
    start(): Promise<void>;
    destroy(): void;
}
export default function init(config: SebeVerifyConfig): SebeVerifySDK;
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
export declare function createVerificationSession(config: CreateVerificationSessionOptions): Promise<CreateVerificationSessionResult>;
