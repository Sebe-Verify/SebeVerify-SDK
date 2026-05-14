"use client";

import { ShieldCheck, Lock, Clock } from "lucide-react";
import { useVerificationStore } from "@/lib/verification-store";

export function IntroScreen() {
  const setStep = useVerificationStore((state) => state.setStep);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Welcome art area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 28px 24px',
        textAlign: 'center',
      }}>
        {/* Illustration */}
        <div style={{
          width: 112,
          height: 112,
          borderRadius: '28px',
          background: 'var(--sv-brand-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
          boxShadow: '0 0 0 16px rgba(44,91,255,0.05)',
        }}>
          <ShieldCheck size={52} color="var(--sv-brand)" strokeWidth={1.5} />
        </div>

        <h1 className="sv-display" style={{ marginBottom: 12, maxWidth: 280 }}>
          Verify your identity
        </h1>

        <p className="sv-lede" style={{ maxWidth: 280 }}>
          A quick, secure check to protect your account and prevent fraud.
        </p>

        {/* Step pills */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 32,
          width: '100%',
          maxWidth: 320,
        }}>
          {[
            { num: '1', label: 'Scan your document' },
            { num: '2', label: 'Take a selfie' },
            { num: '3', label: 'Submit for review' },
          ].map(({ num, label }) => (
            <div key={num} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'var(--sv-card)',
              borderRadius: 'var(--sv-radius-sm)',
              border: '1px solid var(--sv-hairline)',
              boxShadow: 'var(--sv-shadow-card)',
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--sv-brand)',
                color: '#fff',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {num}
              </div>
              <span style={{ fontSize: 14, color: 'var(--sv-ink-2)', fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action area */}
      <div style={{
        padding: '16px 24px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--sv-hairline-2)',
        background: 'rgba(250,250,246,0.9)',
        backdropFilter: 'blur(8px)',
      }}>
        <button
          type="button"
          onClick={() => setStep("doc-select")}
          className="sv-cta sv-cta-primary"
        >
          Start verification
        </button>

        <div className="sv-trust-row" style={{ marginTop: 16 }}>
          <span className="sv-trust-chip">
            <Lock size={13} />
            Encrypted
          </span>
          <span className="sv-trust-chip">
            <ShieldCheck size={13} />
            GDPR compliant
          </span>
          <span className="sv-trust-chip">
            <Clock size={13} />
            ~2 minutes
          </span>
        </div>

        <p style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--sv-ink-4)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          fontFamily: "'Geist Mono', monospace",
        }}>
          Powered by SebeVerify
        </p>
      </div>
    </div>
  );
}
