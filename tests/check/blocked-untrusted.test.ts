import { it, expect, vi } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'untrusted-skill': skill({ skillFolderHash: 'old-hash', trusted: false }),
    }),
  getGitHubToken: () => null,
  // A real update is available, but the gate must prevent it
  fetchSkillFolderHash: async () => 'new-hash',
}))

it('blocks non-trusted configs and points to --force', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck([], { autoUpdate: true })

  expect(getLogs()).toMatchInlineSnapshot(`
    "warn: 1 item(s) blocked (not trusted) — run maconfai update --force to update anyway
    message:   - untrusted-skill"
  `)
})
