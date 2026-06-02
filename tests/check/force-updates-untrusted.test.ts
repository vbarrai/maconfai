import { it, expect, vi } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'my-skill': skill({
        skillFolderHash: 'old-hash',
        skillPath: 'skills/my-skill/SKILL.md',
        trusted: false,
      }),
    }),
  getGitHubToken: () => null,
  addToLock: async () => {},
  addMcpToLock: async () => {},
  addHookToLock: async () => {},
  fetchSkillFolderHash: async () => 'new-hash',
}))

it('updates a non-trusted config when --force is passed', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck(['--force'], { autoUpdate: true })

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 update(s) available:
    message:   * my-skill (owner/repo)
    success: Updated skill: my-skill
    success: Updated 1 item(s)"
  `)
})
