import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'outdated-skill': skill({ skillFolderHash: 'old-hash' }),
      'fresh-skill': skill({ skillFolderHash: 'same-hash' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async (_source: string, path: string) => {
    if (path === 'skills/my-skill/SKILL.md') return 'new-hash'
    return 'same-hash'
  },
}))

it('should list updates and allow declining', async () => {
  mocks.confirm.mockResolvedValueOnce(false)
  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 2 update(s) available:
    message:   * outdated-skill (owner/repo)
    message:   * fresh-skill (owner/repo)
    info: Skipped updates."
  `)
})
