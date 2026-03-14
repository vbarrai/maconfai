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

it('returns null when CLI outputs empty string', async () => {
  mockExecSync.mockReturnValue('')

  const { getGitHubToken } = await import('../../../src/lock.ts')

  expect(getGitHubToken()).toMatchInlineSnapshot(`null`)
})
