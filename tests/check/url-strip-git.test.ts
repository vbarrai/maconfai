import { it, expect, vi } from 'vitest'
import {
  mocks,
  mockCloneRepo,
  mockParseSource,
  mockDiscoverSkills,
  mockAddToLock,
  lockWith,
  skill,
} from './check-test-utils.ts'

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'git-suffix': skill({
        skillFolderHash: 'old',
        sourceUrl: 'https://github.com/owner/repo.git',
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new',
  addToLock: (name: string, entry: unknown, cwd?: string) => mockAddToLock(name, entry, cwd),
}))

it('should parse sourceUrl correctly even with .git suffix', async () => {
  mockDiscoverSkills.mockResolvedValueOnce([
    { name: 'git-suffix', description: 'A skill', dir: '/tmp/mock/skills/git-suffix' },
  ])
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(mockParseSource).toHaveBeenCalledWith('https://github.com/owner/repo.git')
  expect(mockCloneRepo).toHaveBeenCalled()
})
