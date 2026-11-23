import { it, expect, vi, afterEach } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

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

afterEach(() => {
  process.exitCode = undefined
})

it('should handle mixed results: up-to-date, skipped, and errored', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 item(s) skipped (no version tracking)
    message:   - no-tracking: No version hash
    error: 1 item(s) could not be checked for updates:
    message:   - broken: Network error"
  `)
  expect(process.exitCode).toBe(1)
})
