import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

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
}))

const mockSpawnSync = vi.fn(() => ({ status: 0 }))
vi.mock('child_process', () => ({
  spawnSync: (...args: any[]) => mockSpawnSync(...args),
}))

it('should use main as default branch when no ref', async () => {
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  const installArgs = mockSpawnSync.mock.calls[0]![1] as string[]
  expect(installArgs.slice(1)).toMatchInlineSnapshot(`
    [
      "install",
      "https://github.com/owner/repo/tree/main/skills/my-skill",
      "-g",
      "-y",
    ]
  `)
})
