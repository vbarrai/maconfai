import { it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockExecSync = vi.fn()
vi.mock('child_process', () => ({
  execSync: (...args: any[]) => mockExecSync(...args),
}))

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => '/tmp/fake-home-token-test' }
})

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  mockExecSync.mockReset()
  delete process.env.GITHUB_TOKEN
  delete process.env.GH_TOKEN
})

afterEach(() => {
  process.env = { ...originalEnv }
})

it('falls back to GH_TOKEN when GITHUB_TOKEN is absent', async () => {
  process.env.GH_TOKEN = 'ghp_fallback'

  const { getGitHubToken } = await import('../../../src/lock.ts')

  expect(getGitHubToken()).toMatchInlineSnapshot(`"ghp_fallback"`)
})
