import { it, expect, vi } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

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
    "success: All skills, MCPs, and hooks are up to date
    info: 2 item(s) skipped (no version tracking)
    message:   - no-hash: No version hash
    message:   - also-no-hash: No version hash"
  `)
})
