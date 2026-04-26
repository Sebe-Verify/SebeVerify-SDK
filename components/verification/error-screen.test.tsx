import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorScreen } from './error-screen'
import { useVerificationStore } from '@/lib/verification-store'

vi.mock('@/lib/verification-store', () => ({
  useVerificationStore: vi.fn()
}))

describe('ErrorScreen', () => {
  const mockReset = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useVerificationStore as any).mockReturnValue({
      errorMessage: 'Custom error message',
      reset: mockReset
    })
  })

  it('renders correctly with custom error message', () => {
    render(<ErrorScreen />)
    expect(screen.getByText('Verification Failed')).toBeInTheDocument()
    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })

  it('calls reset and onRetry when Try Again is clicked', () => {
    const mockOnRetry = vi.fn()
    render(<ErrorScreen onRetry={mockOnRetry} />)
    
    const retryButton = screen.getByRole('button', { name: /Try Again/i })
    fireEvent.click(retryButton)
    
    expect(mockReset).toHaveBeenCalled()
    expect(mockOnRetry).toHaveBeenCalled()
  })

  it('calls onClose when Cancel button is clicked', () => {
    const mockOnClose = vi.fn()
    render(<ErrorScreen onClose={mockOnClose} />)
    
    const cancelButton = screen.getByRole('button', { name: /Cancel Verification/i })
    fireEvent.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })
})
