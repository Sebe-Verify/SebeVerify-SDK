"use client"

import { Info } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"

const tips = [
  "Place your ID on a flat surface",
  "Use good, even lighting",
  "Avoid glare and shadows",
  "Keep all four corners visible",
] as const

export function CameraAccessScreen() {
  const setStep = useVerificationStore((s) => s.setStep)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px 20px' }}>
      <div style={{ flex: 1 }}>
        <div className="sv-step-pill" style={{ marginBottom: 16 }}>
          <span className="sv-step-pill-num">2</span>
          Scan ID
        </div>

        <h1 className="sv-display" style={{ marginBottom: 8 }}>
          Prepare your document
        </h1>
        <p className="sv-lede" style={{ marginBottom: 28 }}>
          For best results, follow the tips below before opening the camera.
        </p>

        <ul className="sv-prep-list">
          {tips.map((tip, i) => (
            <li key={tip} className="sv-prep-item">
              <span className="sv-prep-num">{i + 1}</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        <div style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 'var(--sv-radius-sm)',
          background: 'var(--sv-brand-soft)',
          border: '1px solid rgba(44,91,255,0.15)',
          fontSize: 13,
          color: 'var(--sv-brand-ink)',
          lineHeight: 1.45,
        }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>We&apos;ll request camera access when you continue</span>
        </div>
      </div>

      <div style={{
        paddingTop: 24,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}>
        <button
          type="button"
          onClick={() => setStep("id-front")}
          className="sv-cta sv-cta-primary"
        >
          Open camera
        </button>
        <p style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--sv-ink-4)', fontFamily: "'Geist Mono', monospace", letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          Powered by SebeVerify
        </p>
      </div>
    </div>
  )
}
