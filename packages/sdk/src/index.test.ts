import { describe, it, expect, beforeEach } from 'vitest'
import SebeVerify, { init } from './index'

describe('SebeVerify SDK', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = ''
  })

  it('exports init function', () => {
    expect(typeof init).toBe('function')
    expect(typeof SebeVerify.init).toBe('function')
  })

  it('throws an error if initialized without apiKey', () => {
    expect(() => init({ apiKey: '', redirectUrl: 'http://localhost' })).toThrow('SebeVerify: apiKey is required')
  })

  it('throws an error if initialized without redirectUrl', () => {
    expect(() => init({ apiKey: 'test-key', redirectUrl: '' })).toThrow('SebeVerify: redirectUrl is required')
  })

  it('initializes successfully with valid config', () => {
    const sdk = init({ apiKey: 'test-key', redirectUrl: 'http://localhost' })
    expect(sdk).toBeDefined()
  })
})
