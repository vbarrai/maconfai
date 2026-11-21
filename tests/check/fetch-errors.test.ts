import { it, expect, vi, afterEach } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

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

afterEach(() => {
  process.exitCode = undefined
})

it('should fail on a source it cannot read, and only skip a folder the source no longer has', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 item(s) skipped (no version tracking)
    message:   - fetch-null: Not found in the source
    error: 1 item(s) could not be checked for updates:
    message:   - rate-limited: API rate limit"
  `)
  expect(process.exitCode).toBe(1)
})
