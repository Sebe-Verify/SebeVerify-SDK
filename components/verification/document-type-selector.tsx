"use client"

import { CreditCard, BookOpen, ChevronRight } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"
import type { DocumentType } from "@/lib/verification-store"

const documentTypes: {
  type: DocumentType
  label: string
  description: string
  Icon: typeof CreditCard
}[] = [
  {
    type: 'national_id',
    label: 'National ID Card',
    description: 'Government-issued national identity card',
    Icon: CreditCard,
  },
  {
    type: 'passport',
    label: 'Passport',
    description: 'International travel document',
    Icon: BookOpen,
  },
]

export function DocumentTypeSelector() {
  const { documentType, setDocumentType, setStep } = useVerificationStore()

  const handleSelect = (type: DocumentType) => {
    setDocumentType(type)
    setStep('id-camera-prep')
  }

  return (
    <div className="flex flex-col flex-1 px-5 py-7">
      <div className="mb-7">
        <div className="sv-step-pill mb-4">
          <span className="sv-step-pill-num">1</span>
          Document
        </div>

        <h1 className="sv-display mb-2">
          Choose document type
        </h1>
        <p className="sv-lede">
          Select the ID you have on hand. Make sure it&apos;s valid and unexpired.
        </p>
      </div>

      <div className="sv-doc-list">
        {documentTypes.map(({ type, label, description, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleSelect(type)}
            className={`sv-doc-row${documentType === type ? ' active' : ''}`}
          >
            <div className="sv-doc-art">
              <Icon size={26} color="var(--sv-brand)" strokeWidth={1.5} />
            </div>
            <div>
              <div className="sv-doc-title">{label}</div>
              <div className="sv-doc-sub">{description}</div>
            </div>
            <ChevronRight size={16} color="var(--sv-ink-4)" />
          </button>
        ))}
      </div>

      <p className="mt-auto pt-6 text-center text-xs text-(--sv-ink-4)">
        Your document data is encrypted in transit
      </p>
    </div>
  )
}
