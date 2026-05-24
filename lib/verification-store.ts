import { create } from "zustand";
import {
  apiCompleteMockSession,
  apiUpdateMockSession,
  isMockSessionId,
} from "@/lib/mock-api-client";

export type VerificationStep =
  | "intro"
  | "doc-select"
  | "id-camera-prep"
  | "id-front"
  | "id-back"
  | "review"
  | "selfie"
  | "submitting"
  | "submitted"
  | "error";

export type DocumentType = "passport" | "national_id";

const BACKEND_DOC_TYPE: Record<DocumentType, string> = {
  passport: "passport",
  national_id: "national-id",
};

export interface VerificationData {
  sessionId: string | null;
  documentType: DocumentType | null;
  frontImage: string | null;
  backImage: string | null;
  selfieImage: string | null;
  livenessImages: string[];
  submittedAt: string | null;
}

interface VerificationState {
  sessionId: string | null;
  currentStep: VerificationStep;
  documentType: DocumentType | null;
  frontImage: string | null;
  backImage: string | null;
  selfieImage: string | null;
  livenessImages: string[];
  submittedAt: string | null;
  errorMessage: string | null;
  errorDebug: string | null;

  // Prevents duplicate submissions (double-tap, fast retries)
  isSubmitting: boolean;

  // SDK config (set from verify page query params)
  projectId: string | null;
  apiKey: string | null;

  // Set once when doc type is selected; sent to backend for session start and upload
  documentId: string | null;
  // session_id returned by backend /verification/session/start
  backendSessionId: string | null;
  // request_id returned by backend /verification/image (used for status polling)
  requestId: string | null;

  setSessionId: (id: string) => void;
  setStep: (step: VerificationStep) => void;
  setDocumentType: (type: DocumentType) => void;
  setDocumentId: (id: string) => void;
  setFrontImage: (image: string) => void;
  setBackImage: (image: string) => void;
  setSelfieImage: (image: string) => void;
  setLivenessImages: (images: string[]) => void;
  setError: (message: string) => void;
  setApiConfig: (config: {
    projectId?: string;
    apiKey?: string;
  }) => void;
  getVerificationData: () => VerificationData;
  submitVerification: () => Promise<void>;
  retrySubmission: () => void;
  reset: () => void;
  resetFlow: () => void;
  goBack: () => void;
}

const stepOrder: VerificationStep[] = [
  "intro",
  "doc-select",
  "id-camera-prep",
  "id-front",
  "id-back",
  "review",
  "selfie",
  "submitting",
  "submitted",
];

// Module-level abort controller so in-flight fetches and polling are cancelled
// whenever the user navigates away or a new submission starts.
let submissionAbortController: AbortController | null = null;

export const useVerificationStore = create<VerificationState>((set, get) => ({
  sessionId: null,
  currentStep: "intro",
  documentType: null,
  frontImage: null,
  backImage: null,
  selfieImage: null,
  livenessImages: [],
  submittedAt: null,
  errorMessage: null,
  errorDebug: null,
  isSubmitting: false,
  projectId: null,
  apiKey: null,
  documentId: null,
  backendSessionId: null,
  requestId: null,

  setSessionId: (id) => set({ sessionId: id }),

  setStep: (step) => set({ currentStep: step }),

  setDocumentType: (type) => {
    const existing = get().documentId;
    set({
      documentType: type,
      // Generate once; stable across the whole verification attempt
      documentId: existing ?? crypto.randomUUID(),
    });
    const sid = get().sessionId;
    if (isMockSessionId(sid)) {
      void apiUpdateMockSession(sid!, { documentType: type });
    }
  },

  setDocumentId: (id) => set({ documentId: id }),

  setFrontImage: (image) => {
    set({ frontImage: image });
    const sid = get().sessionId;
    if (isMockSessionId(sid)) {
      void apiUpdateMockSession(sid!, { frontImage: image });
    }
  },

  setBackImage: (image) => {
    set({ backImage: image });
    const sid = get().sessionId;
    if (isMockSessionId(sid)) {
      void apiUpdateMockSession(sid!, { backImage: image });
    }
  },

  setSelfieImage: (image) => {
    set({ selfieImage: image });
    const sid = get().sessionId;
    if (isMockSessionId(sid)) {
      void apiUpdateMockSession(sid!, { selfieImage: image });
    }
  },

  setLivenessImages: (images) => {
    set({ livenessImages: images });
  },

  setError: (message) =>
    set({ errorMessage: message, errorDebug: null, currentStep: "error", isSubmitting: false }),

  setApiConfig: ({ projectId, apiKey }) => {
    set({
      projectId: projectId || null,
      apiKey: apiKey || null,
    });
  },

  getVerificationData: () => {
    const state = get();
    return {
      sessionId: state.sessionId,
      documentType: state.documentType,
      frontImage: state.frontImage,
      backImage: state.backImage,
      selfieImage: state.selfieImage,
      livenessImages: state.livenessImages,
      submittedAt: state.submittedAt,
    };
  },

  submitVerification: async () => {
    // Guard: prevent duplicate submissions from double-taps or race conditions
    if (get().isSubmitting) return;

    // Cancel any previous in-flight submission before starting a new one
    submissionAbortController?.abort();
    submissionAbortController = new AbortController();
    const { signal } = submissionAbortController;

    set({ currentStep: "submitting", isSubmitting: true });
    const state = get();
    let sid = state.sessionId;

    const hasProjectMode = Boolean(state.projectId && state.apiKey);

    try {
      if (hasProjectMode) {
        // hasProjectMode guarantees these are non-null
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const projectId = state.projectId!;
        const apiKey = state.apiKey!;

        if (!state.frontImage || !state.selfieImage) {
          throw new Error("Captured images are missing — front document and selfie are required");
        }

        const backendDocType = BACKEND_DOC_TYPE[state.documentType ?? "national_id"];
        const docId = state.documentId ?? crypto.randomUUID();

        // 1. Create a backend verification session (required before image upload)
        const sessionRes = await fetch(
          `${backendUrl}/projects/${projectId}/verification/session/start`,
          {
            method: "POST",
            headers: {
              "X-API-Key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              document_type: backendDocType,
              document_id: docId,
            }),
            signal,
          },
        );
        if (!sessionRes.ok) {
          const body = await sessionRes.text();
          throw new Error(`session/start ${sessionRes.status}: ${body}`);
        }
        const { session_id: backendSessionId } = (await sessionRes.json()) as {
          session_id: string;
        };
        set({ backendSessionId });

        // 2. Upload images + liveness frames
        let formData: FormData;
        try {
          formData = buildFormData(state, backendDocType, docId);
        } catch (buildErr) {
          throw new Error(
            `Failed to encode images for upload: ${buildErr instanceof Error ? buildErr.message : String(buildErr)}`,
          );
        }
        formData.append("session_id", backendSessionId);

        const uploadUrl = `${backendUrl}/projects/${projectId}/verification/image`;
        let submitRes: Response;
        try {
          submitRes = await fetch(uploadUrl, {
            method: "POST",
            headers: { "X-API-Key": apiKey },
            body: formData,
            signal,
          });
        } catch (fetchErr) {
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          throw Object.assign(
            new Error(`Upload blocked — ${msg}`),
            {
              debug: [
                `URL: POST ${uploadUrl}`,
                `Origin: ${typeof window !== "undefined" ? window.location.origin : "unknown"}`,
                `Cause: ${msg}`,
                `Tip: If using HTTPS (ngrok), the browser blocks HTTP-localhost requests.`,
                `     Open Chrome DevTools → Console/Network for the full error.`,
              ].join("\n"),
            },
          );
        }
        if (!submitRes.ok) {
          const body = await submitRes.text();
          throw new Error(`verification/image ${submitRes.status}: ${body}`);
        }
        const { request_id: requestId } = (await submitRes.json()) as {
          request_id: string;
        };
        set({ requestId });

        // Images accepted — the backend processes and runs verification asynchronously.
        // The result is delivered to the merchant via webhook; no polling needed here.
      } else {
        // Mock mode — local dev only
        try {
          if (!isMockSessionId(sid)) {
            const res = await fetch("/api/mock/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            const json = (await res.json()) as { sessionId: string };
            sid = json.sessionId;
            set({ sessionId: sid });
          }

          await apiUpdateMockSession(sid!, {
            documentType: state.documentType ?? undefined,
            frontImage: state.frontImage ?? undefined,
            backImage: state.backImage ?? undefined,
            selfieImage: state.selfieImage ?? undefined,
            livenessImages:
              state.livenessImages.length > 0 ? state.livenessImages : undefined,
          });
          await apiCompleteMockSession(sid!);
        } catch (e) {
          console.error("Mock submit failed:", e);
          // Mock failures are non-fatal — fall through to submitted state
        }
      }

      // Brief pause for mock mode so the submitting spinner is visible
      if (!hasProjectMode) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, state.sessionId ? 400 : 2000),
        );
      }

      // Don't transition to submitted if the submission was aborted
      if (signal.aborted) return;

      const submittedAt = new Date().toISOString();
      set({ submittedAt, currentStep: "submitted" });
    } catch (e) {
      // User navigated away mid-submission — not an error worth showing
      if ((e as Error).name === "AbortError") return;

      console.error("[SebeVerify] Submit failed:", e);
      set({
        errorMessage: e instanceof Error ? e.message : "Verification submission failed",
        errorDebug: (e as { debug?: string }).debug ?? null,
        currentStep: "error",
      });
    } finally {
      set({ isSubmitting: false });
      submissionAbortController = null;
    }
  },

  // Retry after a backend failure — clears error state and resubmits using the
  // already-captured images. Does NOT wipe frontImage/backImage/selfieImage.
  retrySubmission: () => {
    set({ errorMessage: null, errorDebug: null });
    void get().submitVerification();
  },

  // Full reset — clears everything including API config. Used when navigating to a
  // fresh verify URL (verify-page-client calls this before wiring new URL params).
  reset: () => {
    submissionAbortController?.abort();
    submissionAbortController = null;
    set({
      sessionId: null,
      currentStep: "intro",
      documentType: null,
      frontImage: null,
      backImage: null,
      selfieImage: null,
      livenessImages: [],
      submittedAt: null,
      errorMessage: null,
      errorDebug: null,
      isSubmitting: false,
      projectId: null,
      apiKey: null,
      documentId: null,
      backendSessionId: null,
      requestId: null,
    });
  },

  // Partial reset — clears captured images and flow state but keeps the API config
  // (projectId, apiKey, sessionId) so a retry within the same session
  // stays in project mode instead of falling through to mock mode.
  resetFlow: () => {
    submissionAbortController?.abort();
    submissionAbortController = null;
    set((s) => ({
      currentStep: "intro",
      documentType: null,
      frontImage: null,
      backImage: null,
      selfieImage: null,
      livenessImages: [],
      submittedAt: null,
      errorMessage: null,
      errorDebug: null,
      isSubmitting: false,
      documentId: null,
      backendSessionId: null,
      requestId: null,
      // Preserve: sessionId, projectId, apiKey
      sessionId: s.sessionId,
      projectId: s.projectId,
      apiKey: s.apiKey,
    }));
  },

  goBack: () => {
    const { currentStep, documentType } = get();

    // Cannot navigate back from terminal or in-progress states
    if (
      currentStep === "error" ||
      currentStep === "submitting" ||
      currentStep === "submitted"
    ) {
      return;
    }

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      if (currentStep === "review" && documentType === "passport") {
        set({ currentStep: "id-front" });
      } else {
        set({ currentStep: stepOrder[currentIndex - 1] });
      }
    }
  },
}));

function buildFormData(
  state: {
    frontImage: string | null;
    backImage: string | null;
    selfieImage: string | null;
    livenessImages: string[];
  },
  backendDocumentType: string,
  documentId: string,
) {
  const formData = new FormData();
  formData.append("document_type", backendDocumentType);
  formData.append("document_id", documentId);

  if (state.frontImage) {
    formData.append("document_image", dataURLtoBlob(state.frontImage), "front.jpg");
  }

  if (state.selfieImage) {
    formData.append("person_image", dataURLtoBlob(state.selfieImage), "selfie.jpg");
  }

  if (state.backImage) {
    formData.append("document_image_back", dataURLtoBlob(state.backImage), "back.jpg");
  }

  state.livenessImages.forEach((img, idx) => {
    formData.append("liveness_images", dataURLtoBlob(img), `liveness_${idx}.jpg`);
  });

  return formData;
}

function dataURLtoBlob(dataURL: string): Blob {
  const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, "");
  const byteCharacters = atob(base64Data);
  // Uint8Array.from avoids the intermediate JS number array, halving peak memory use
  const byteArray = Uint8Array.from(byteCharacters, (c) => c.charCodeAt(0));
  return new Blob([byteArray], { type: "image/jpeg" });
}
