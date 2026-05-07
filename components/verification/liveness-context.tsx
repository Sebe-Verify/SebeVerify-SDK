"use client"

import React, { createContext, useContext } from "react";
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { useMediaPipe } from "@/hooks/useMediaPipe";

interface LivenessContextType {
  landmarker: FaceLandmarker | null;
  isInitializing: boolean;
  error: Error | null;
  initLivenessEngine: () => Promise<void>;
}

const LivenessContext = createContext<LivenessContextType | null>(null);

export function LivenessProvider({ children }: { children: React.ReactNode }) {
  const mp = useMediaPipe();

  return (
    <LivenessContext.Provider value={mp}>
      {children}
    </LivenessContext.Provider>
  );
}

export function useLiveness() {
  const context = useContext(LivenessContext);
  if (!context) {
    throw new Error("useLiveness must be used within a LivenessProvider");
  }
  return context;
}
