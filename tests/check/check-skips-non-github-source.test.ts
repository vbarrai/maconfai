import { it, expect, vi, afterEach } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

// A skill installed from another host (GitLab, a private Git server) has no hash on the
// GitHub API: the check leaves it alone instead of failing the run on a 404. Local sources
// are compared on disk instead (tests/update/local-source/).
const fetchSkillFolderHash = vi.fn(async () => 'new-hash')
vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      gitlab: skill({
        source: 'group/repo',
        sourceUrl: 'https://gitlab.example.com/group/repo.git',
        trusted: true,
      }),
    }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: () => fetchSkillFolderHash(),
}))

afterEach(() => {
  process.exitCode = undefined
})

it('does not check a non-GitHub host against the GitHub API', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck([], { autoUpdate: true })

  expect(fetchSkillFolderHash).not.toHaveBeenCalled()
  expect(getLogs()).toMatchInlineSnapshot(`
    "success: All skills, MCPs, and hooks are up to date
    info: 1 item(s) skipped (no version tracking)
    message:   - gitlab: Not a GitHub source"
  `)
  expect(process.exitCode).toBeUndefined()
})
