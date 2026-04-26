import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IntroScreen } from './intro-screen'
import { useVerificationStore } from '@/lib/verification-store'

// Mock the store
vi.mock('@/lib/verification-store', () => ({
  useVerificationStore: vi.fn()
}))

describe('IntroScreen', () => {
  const mockSetStep = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useVerificationStore as any).mockImplementation((selector: any) => {
      const state = { setStep: mockSetStep }
      return selector ? selector(state) : state
    })
  })

  it('renders correctly', () => {
    render(<IntroScreen />)
    expect(screen.getByText('Verify your identity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start verification/i })).toBeInTheDocument()
  })

  it('calls setStep with "doc-select" when button is clicked', () => {
    render(<IntroScreen />)
    const startButton = screen.getByRole('button', { name: /Start verification/i })
    fireEvent.click(startButton)
    expect(mockSetStep).toHaveBeenCalledWith('doc-select')
  })
})
