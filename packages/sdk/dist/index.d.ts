/**
 * SebeVerify Web SDK
 * Embeddable identity verification SDK for merchants
 * Compatible with SebeVerify Backend (real API)
 */
export interface SebeVerifyConfig {
    apiKey: string;
    projectId: string;
    /** Override the SebeVerify-hosted web app URL (only needed for self-host / dev / staging) */
    webAppUrl?: string;
    redirectUrl: string;
    theme?: {
        primaryColor?: string;
        borderRadius?: string;
    };
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
type EventType = "started" | "mobile_opened" | "success" | "error" | "cancelled" | "pending";
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
    private getApiHeaders;
    private createSession;
    private createModal;
    private closeModal;
    private isMobile;
    start(): Promise<void>;
    submitDocument(_options: {
        frontImage: Blob;
        backImage?: Blob;
        selfieImage: Blob;
        documentType?: string;
    }): Promise<void>;
    destroy(): void;
}
export default function init(config: SebeVerifyConfig): SebeVerifySDK;
export { SebeVerifySDK };
/**
 * Server-side verification functions for use in Next.js API routes.
 * These functions handle verification logic on the server.
 */
export interface VerificationRequest {
    sessionId: string;
    documentType?: string;
    documentId?: string;
    frontImage?: string;
    backImage?: string;
    selfieImage?: string;
}
export interface VerificationResponse {
    success: boolean;
    sessionId: string;
    status: "pending" | "approved" | "rejected";
    message?: string;
    requestId?: string;
    verifiedAt?: string;
}
export interface CreateVerificationSessionOptions {
    apiKey: string;
    projectId: string;
    backendUrl?: string;
    documentType?: string;
    documentId?: string;
}
export interface CreateVerificationSessionResult {
    sessionId: string;
    backendUrl: string;
    projectId: string;
}
/**
 * Creates a real verification session on SebeVerify backend.
 */
export declare function createVerificationSession(config: CreateVerificationSessionOptions): Promise<CreateVerificationSessionResult>;
/**
 * Legacy in-memory helper kept for backwards compatibility.
 */
export declare function initiateVerification(config: {
    apiKey: string;
    projectId: string;
    backendUrl?: string;
}): {
    sessionId: string;
    verificationUrl: string;
};
export declare function verifyUser(request: VerificationRequest): VerificationResponse;
export declare function getVerificationStatus(sessionId: string): VerificationResponse | null;
