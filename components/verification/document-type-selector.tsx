"use client"

import { CreditCard, BookOpen, Car, ChevronRight } from "lucide-react"
import { useVerificationStore } from "@/lib/verification-store"
import type { DocumentType } from "@/lib/verification-store"
import { cn } from "@/lib/utils"

const documentTypes: { type: DocumentType; label: string; icon: typeof CreditCard; description: string }[] = [
  {
    type: 'national_id',
    label: 'National ID Card',
    icon: CreditCard,
    description: 'Government-issued national identity card'
  },
  {
    type: 'passport',
    label: 'Passport',
    icon: BookOpen,
    description: 'International travel document'
  }
]

export function DocumentTypeSelector() {
  const { documentType, setDocumentType, setStep } = useVerificationStore()

  const handleSelect = (type: DocumentType) => {
    setDocumentType(type)
    setStep('id-camera-prep')
  }

  return (
    <div className="flex flex-col flex-1 px-6 py-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Select document type
        </h1>
        <p className="text-muted-foreground">
          Choose the type of document you want to use for verification.
        </p>
      </div>

      <div className="space-y-3">
        {documentTypes.map((doc) => (
          <button
            key={doc.type}
            onClick={() => handleSelect(doc.type)}
            className={cn(
              "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all",
              "hover:border-primary hover:bg-primary/5",
              documentType === doc.type
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <doc.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground">{doc.label}</h3>
              <p className="truncate text-sm text-muted-foreground">{doc.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="mt-auto pt-8">
        <p className="text-xs text-center text-muted-foreground">
          Make sure your document is valid and not expired
        </p>
      </div>
    </div>
  )
}
