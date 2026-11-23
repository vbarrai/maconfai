import { cpus } from 'os'
import { defineConfig } from 'vitest/config'

// Never let a test touch the real user-scope configs: see the file. Projects do not
// inherit the root setup files, so each one lists it.
const fakeHome = 'tests/setup-fake-home.ts'

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
    projects: [
      {
        test: {
          name: 'check',
          include: ['tests/check/**/*.test.ts'],
          setupFiles: [fakeHome, 'tests/check/setup.ts'],
        },
      },
      {
        test: {
          name: 'default',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/check/**/*.test.ts'],
          setupFiles: [fakeHome],
        },
      },
    ],
  },
})
