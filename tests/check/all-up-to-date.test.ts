import { it, expect, vi } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'my-skill': skill({ skillFolderHash: 'current-hash' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'current-hash',
}))

it('should report all skills up to date', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`"success: All skills, MCPs, and hooks are up to date"`)
})
