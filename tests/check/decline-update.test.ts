import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'outdated-skill': skill({ skillFolderHash: 'old-hash' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
}))

const mockSpawnSync = vi.fn(() => ({ status: 0 }))
vi.mock('child_process', () => ({
  spawnSync: (...args: any[]) => mockSpawnSync(...args),
}))

it('should skip updates when user declines', async () => {
  mocks.confirm.mockResolvedValueOnce(false)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 update(s) available:
    message:   * outdated-skill (owner/repo)
    info: Skipped updates."
  `)
  expect(mockSpawnSync).not.toHaveBeenCalled()
})
