import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'rate-limited': skill({ skillFolderHash: 'hash1', source: 'owner/repo1' }),
      'fetch-null': skill({ skillFolderHash: 'hash2', source: 'owner/repo2' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async (source: string) => {
    if (source === 'owner/repo1') throw new Error('API rate limit')
    return null
  },
}))

it('should report fetch errors and null results', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "warn: 2 skill(s) could not be checked:
    message:   - rate-limited: API rate limit
    message:   - fetch-null: Could not fetch from GitHub"
  `)
})
