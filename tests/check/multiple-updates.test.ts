import { it, expect, vi } from 'vitest'
import { setupCheckMocks, lockWith, skill } from './check-test-utils.ts'

const { mocks, getLogs } = setupCheckMocks()

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'skill-a': skill({
        skillFolderHash: 'old-a',
        source: 'alice/repo-a',
        sourceUrl: 'https://github.com/alice/repo-a',
      }),
      'skill-b': skill({
        skillFolderHash: 'old-b',
        source: 'bob/repo-b',
        sourceUrl: 'https://github.com/bob/repo-b',
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
}))

const mockSpawnSync = vi.fn(() => ({ status: 0 }))
vi.mock('child_process', () => ({
  spawnSync: (...args: any[]) => mockSpawnSync(...args),
}))

it('should update multiple outdated skills', async () => {
  mocks.confirm.mockResolvedValueOnce(true)

  const { runCheck } = await import('../../src/check.ts')
  await runCheck()

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 2 update(s) available:
    message:   * skill-a (alice/repo-a)
    message:   * skill-b (bob/repo-b)
    success: Updated skill-a
    success: Updated skill-b
    success: Updated 2 skill(s)"
  `)

  const installUrls = mockSpawnSync.mock.calls.map((c: any) => (c[1] as string[]).slice(1))
  expect(installUrls).toMatchInlineSnapshot(`
    [
      [
        "install",
        "https://github.com/alice/repo-a/tree/main/skills/my-skill",
        "-g",
        "-y",
      ],
      [
        "install",
        "https://github.com/bob/repo-b/tree/main/skills/my-skill",
        "-g",
        "-y",
      ],
    ]
  `)
})
