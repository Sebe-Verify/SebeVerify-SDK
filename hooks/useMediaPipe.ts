import { useState, useCallback, useRef, useEffect } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/**
 * WASM runtime and model served from /public/mediapipe/ (copied by
 * scripts/setup-mediapipe.mjs at install/build time). This avoids
 * runtime CDN dependencies and version mismatches.
 */
const WASM_BASE = "/mediapipe/wasm";
const FACE_LANDMARKER_MODEL = "/mediapipe/models/face_landmarker.task";

const INIT_TIMEOUT_MS = 120_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`${label} (timed out after ${Math.round(ms / 1000)}s)`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

export function useMediaPipe() {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    landmarkerRef.current = landmarker;
  }, [landmarker]);

  const initLivenessEngine = useCallback(async () => {
    if (landmarkerRef.current) return;

    if (!initPromiseRef.current) {
      initPromiseRef.current = (async () => {
        try {
          setIsInitializing(true);
          setError(null);

          const vision = await withTimeout(
            FilesetResolver.forVisionTasks(WASM_BASE),
            INIT_TIMEOUT_MS,
            "Could not load MediaPipe vision runtime",
          );

          const newLandmarker = await withTimeout(
            FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: FACE_LANDMARKER_MODEL,
                delegate: "CPU",
              },
              outputFaceBlendshapes: true,
              outputFacialTransformationMatrixes: true,
              runningMode: "VIDEO",
              numFaces: 1,
            }),
            INIT_TIMEOUT_MS,
            "Could not load face landmarker model",
          );

          landmarkerRef.current = newLandmarker;
          setLandmarker(newLandmarker);
        } catch (err: unknown) {
          console.error("Failed to initialize MediaPipe FaceLandmarker:", err);
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
        } finally {
          setIsInitializing(false);
          initPromiseRef.current = null;
        }
      })();
    }

    await initPromiseRef.current;
  }, []);

  return { landmarker, initLivenessEngine, isInitializing, error };
}
