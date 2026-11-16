"use client"

import { useState } from "react"
import { CameraCapture } from "./camera-capture"
import { useVerificationStore } from "@/lib/verification-store"

// Guide frame width / height. Passport data page: ID-3, 125 x 88 mm, landscape.
const PASSPORT_ASPECT = 125 / 88
const ID_CARD_ASPECT = 1.6

export function IdFrontCapture() {
  const { documentType, setFrontImage, setStep } = useVerificationStore()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const documentLabels = {
    passport: 'Passport Photo Page',
    national_id: 'ID Card Front',
  }

  const handleCapture = (imageData: string) => {
    if (capturedImage) {
      // User confirmed the image
      setFrontImage(imageData)
      if (documentType === 'passport') {
        setStep('review')
      } else {
        setStep('id-back')
      }
    } else {
      // First capture, show preview
      setCapturedImage(imageData)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
  }

  return (
    <CameraCapture
      title={`Capture ${documentLabels[documentType || 'national_id']}`}
      instructions="Position your ID card inside the frame"
      onCapture={handleCapture}
      onRetake={handleRetake}
      capturedImage={capturedImage}
      overlayType="document"
      documentAspectRatio={documentType === 'passport' ? PASSPORT_ASPECT : ID_CARD_ASPECT}
    />
  )
}

export function IdBackCapture() {
  const { documentType, setBackImage, setStep } = useVerificationStore()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const documentLabels = {
    passport: 'Passport',
    national_id: 'ID Card Back',
  }

  const handleCapture = (imageData: string) => {
    if (capturedImage) {
      setBackImage(imageData)
      setStep('review')
    } else {
      setCapturedImage(imageData)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
  }

  return (
    <CameraCapture
      title={`Capture ${documentLabels[documentType || 'national_id']}`}
      instructions="Now capture the back of your document. Make sure the barcode or MRZ is clearly visible."
      onCapture={handleCapture}
      onRetake={handleRetake}
      capturedImage={capturedImage}
      overlayType="document"
    />
  )
}
