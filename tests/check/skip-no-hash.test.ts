import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'no-hash': skill({ skillFolderHash: undefined, skillPath: undefined }),
      'also-no-hash': skill({ skillFolderHash: undefined, skillPath: undefined }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => null,
}))

it('should skip skills without hash or path', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "success: All skills are up to date
    info: 2 skill(s) skipped (no version tracking)
    message:   - no-hash: No version hash
    message:   - also-no-hash: No version hash"
  `)
})
