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
      'trailing-slash': skill({
        skillFolderHash: 'old',
        sourceUrl: 'https://github.com/owner/repo/',
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new',
  addToLock: (name: string, entry: unknown, cwd?: string) => mockAddToLock(name, entry, cwd),
}))

it('should parse sourceUrl correctly even with trailing slash', async () => {
  mockDiscoverSkills.mockResolvedValueOnce([
    { name: 'trailing-slash', description: 'A skill', dir: '/tmp/mock/skills/trailing-slash' },
  ])
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(mockParseSource).toHaveBeenCalledWith('https://github.com/owner/repo/')
  expect(mockCloneRepo).toHaveBeenCalled()
})
