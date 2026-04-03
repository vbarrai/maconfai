import { it, expect, vi } from 'vitest'
import {
  mocks,
  mockDiscoverSkills,
  mockInstallSkill,
  mockAddToLock,
  lockWith,
  skill,
} from './check-test-utils.ts'

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'deep-skill': skill({
        skillFolderHash: 'old',
        skillPath: 'skills/my-skill/SKILL.md',
        ref: 'main',
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new',
  addToLock: (name: string, entry: unknown, cwd?: string) => mockAddToLock(name, entry, cwd),
}))

it('should discover and install the correct skill by name', async () => {
  mockDiscoverSkills.mockResolvedValueOnce([
    { name: 'deep-skill', description: 'A skill', dir: '/tmp/mock/skills/deep-skill' },
    { name: 'other-skill', description: 'Another', dir: '/tmp/mock/skills/other-skill' },
  ])
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(mockInstallSkill).toHaveBeenCalledTimes(1)
  expect((mockInstallSkill.mock.calls[0]![0] as any).name).toBe('deep-skill')
})
