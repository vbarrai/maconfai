import { it, expect, vi } from 'vitest'
import {
  mocks,
  mockDiscoverSkills,
  mockInstallSkill,
  mockAddToLock,
  getLogs,
  lockWith,
  skill,
} from './check-test-utils.ts'

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'failing-skill': skill({ skillFolderHash: 'old-hash' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
  addToLock: (name: string, entry: unknown, cwd?: string) => mockAddToLock(name, entry, cwd),
}))

it('should report failed skill update', async () => {
  mockDiscoverSkills.mockResolvedValueOnce([
    { name: 'failing-skill', description: 'A skill', dir: '/tmp/mock/skills/failing-skill' },
  ])
  mockInstallSkill.mockResolvedValueOnce({ success: false, error: 'Permission denied' } as any)
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 update(s) available:
    message:   * failing-skill (owner/repo)
    error: Failed: failing-skill -> Claude Code: Permission denied
    error: Failed: 1"
  `)
})
