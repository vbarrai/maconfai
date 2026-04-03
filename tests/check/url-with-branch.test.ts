import { it, expect, vi } from 'vitest'
import {
  mocks,
  mockCloneRepo,
  mockDiscoverSkills,
  mockInstallSkill,
  mockAddToLock,
  lockWith,
  skill,
} from './check-test-utils.ts'

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      branched: skill({
        skillFolderHash: 'old',
        ref: 'develop',
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new',
  addToLock: (name: string, entry: unknown, cwd?: string) => mockAddToLock(name, entry, cwd),
}))

it('should clone with the correct ref', async () => {
  mockDiscoverSkills.mockResolvedValueOnce([
    { name: 'branched', description: 'A skill', dir: '/tmp/mock/skills/branched' },
  ])
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/owner/repo', 'develop')
  expect(mockInstallSkill).toHaveBeenCalled()
})
