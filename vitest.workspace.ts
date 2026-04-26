import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'platform',
      include: ['components/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}', 'lib/**/*.test.{ts,tsx}', 'hooks/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'sdk',
      include: ['packages/sdk/src/**/*.test.ts'],
      environment: 'jsdom',
    },
  }
])
