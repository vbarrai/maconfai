import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'failing-skill': skill({ skillFolderHash: 'old-hash' }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
}))

const mockSpawnSync = vi.fn(() => ({ status: 1 }))
vi.mock('child_process', () => ({
  spawnSync: (...args: any[]) => mockSpawnSync(...args),
}))

it('should report failed subprocess update', async () => {
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 update(s) available:
    message:   * failing-skill (owner/repo)
    error: Failed to update failing-skill
    error: Failed: 1"
  `)
})
