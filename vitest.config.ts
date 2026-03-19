import { cpus } from 'os'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    minWorkers: 2,
    maxWorkers: Math.max(2, cpus().length - 1),
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'json-summary'],
    },
  },
})
