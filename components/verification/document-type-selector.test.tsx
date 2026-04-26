import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentTypeSelector } from './document-type-selector'
import { useVerificationStore } from '@/lib/verification-store'

vi.mock('@/lib/verification-store', () => ({
  useVerificationStore: vi.fn()
}))

describe('DocumentTypeSelector', () => {
  const mockSetDocumentType = vi.fn()
  const mockSetStep = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useVerificationStore as any).mockReturnValue({
      documentType: null,
      setDocumentType: mockSetDocumentType,
      setStep: mockSetStep
    })
  })

  it('renders correctly', () => {
    render(<DocumentTypeSelector />)
    expect(screen.getByText('Select Document Type')).toBeInTheDocument()
    expect(screen.getByText('National ID Card')).toBeInTheDocument()
    expect(screen.getByText('Passport')).toBeInTheDocument()
  })

  it('calls setDocumentType and setStep when a document is selected', () => {
    render(<DocumentTypeSelector />)
    
    const nationalIdButton = screen.getByText('National ID Card').closest('button')
    fireEvent.click(nationalIdButton!)
    
    expect(mockSetDocumentType).toHaveBeenCalledWith('national_id')
    expect(mockSetStep).toHaveBeenCalledWith('id-camera-prep')
  })
})
