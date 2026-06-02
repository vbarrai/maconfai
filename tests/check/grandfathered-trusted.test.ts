import { it, expect, vi } from 'vitest'
import { mocks, getLogs, lockWith, skill } from './check-test-utils.ts'

// Entry installed before the `trusted` field existed: no trusted key at all.
// It must be treated as trusted (grandfathered), not blocked.
vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'legacy-skill': skill({ skillFolderHash: 'old-hash' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
}))

it('treats an entry without a trusted field as trusted', async () => {
  mocks.confirm.mockResolvedValueOnce(false)
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  // Listed as an available update (not blocked)
  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 update(s) available:
    message:   * legacy-skill (owner/repo)
    info: Skipped updates."
  `)
})
