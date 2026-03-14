import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'up-to-date': skill({ skillFolderHash: 'aaa', source: 'owner/ok' }),
      'no-tracking': skill({ skillFolderHash: undefined, skillPath: undefined }),
      broken: skill({ skillFolderHash: 'bbb', source: 'owner/broken' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async (source: string) => {
    if (source === 'owner/ok') return 'aaa'
    if (source === 'owner/broken') throw new Error('Network error')
    return null
  },
}))

it('should handle mixed results: up-to-date, skipped, and errored', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 skill(s) skipped (no version tracking)
    message:   - no-tracking: No version hash
    warn: 1 skill(s) could not be checked:
    message:   - broken: Network error"
  `)
})
