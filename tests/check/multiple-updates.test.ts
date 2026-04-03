import { it, expect, vi } from 'vitest'
import {
  mocks,
  mockCloneRepo,
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
      'skill-a': skill({
        skillFolderHash: 'old-a',
        source: 'alice/repo-a',
        sourceUrl: 'https://github.com/alice/repo-a',
      }),
      'skill-b': skill({
        skillFolderHash: 'old-b',
        source: 'bob/repo-b',
        sourceUrl: 'https://github.com/bob/repo-b',
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
  addToLock: (name: string, entry: unknown, cwd?: string) => mockAddToLock(name, entry, cwd),
}))

it('should update multiple outdated skills', async () => {
  mockDiscoverSkills
    .mockResolvedValueOnce([
      { name: 'skill-a', description: 'Skill A', dir: '/tmp/mock/skills/skill-a' },
    ])
    .mockResolvedValueOnce([
      { name: 'skill-b', description: 'Skill B', dir: '/tmp/mock/skills/skill-b' },
    ])
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 2 update(s) available:
    message:   * skill-a (alice/repo-a)
    message:   * skill-b (bob/repo-b)
    success: Updated skill-a
    success: Updated skill-b
    success: Updated 2 skill(s)"
  `)

  // Two different sources → two cloneRepo calls
  expect(mockCloneRepo).toHaveBeenCalledTimes(2)
  expect(mockInstallSkill).toHaveBeenCalledTimes(2)
})
