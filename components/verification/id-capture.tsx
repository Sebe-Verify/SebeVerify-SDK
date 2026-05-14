"use client"

import { useState } from "react"
import { CameraCapture } from "./camera-capture"
import { useVerificationStore } from "@/lib/verification-store"

export function IdFrontCapture() {
  const { documentType, setFrontImage, setStep } = useVerificationStore()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const documentLabels = {
    passport: 'Passport Photo Page',
    national_id: 'ID Card Front',
    driver_license: 'License Front'
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
      instructions="Position your document within the frame. Ensure all text is clearly visible and the image is not blurry."
      onCapture={handleCapture}
      onRetake={handleRetake}
      capturedImage={capturedImage}
      overlayType="document"
      documentAspectRatio={documentType === 'passport' ? 0.704 : 1.6}
    />
  )
}

export function IdBackCapture() {
  const { documentType, setBackImage, setStep } = useVerificationStore()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const documentLabels = {
    passport: 'Passport',
    national_id: 'ID Card Back',
    driver_license: 'License Back'
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
