import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressBar } from './progress-bar'

describe('ProgressBar', () => {
  it('returns null for "intro" step', () => {
    const { container } = render(<ProgressBar currentStep="intro" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null for "submitted" step', () => {
    const { container } = render(<ProgressBar currentStep="submitted" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null for "error" step', () => {
    const { container } = render(<ProgressBar currentStep="error" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders progress bar for active steps like "doc-select"', () => {
    render(<ProgressBar currentStep="doc-select" />)
    expect(screen.getByText('Document')).toBeInTheDocument()
    expect(screen.getByText('Front')).toBeInTheDocument()
  })
})
