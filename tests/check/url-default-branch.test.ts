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
      'no-ref': skill({
        skillFolderHash: 'old',
        ref: undefined,
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new',
  addToLock: (name: string, entry: unknown, cwd?: string) => mockAddToLock(name, entry, cwd),
}))

it('should clone without ref when no ref in lock entry', async () => {
  mockDiscoverSkills.mockResolvedValueOnce([
    { name: 'no-ref', description: 'A skill', dir: '/tmp/mock/skills/no-ref' },
  ])
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/owner/repo', undefined)
  expect(mockInstallSkill).toHaveBeenCalled()
})
