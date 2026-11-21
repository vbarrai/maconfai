import { it, expect, vi, afterEach } from 'vitest'
import { mocks, getLogs, lockWith, skill } from './check-test-utils.ts'

// One unreachable private source is reported, but the other entries still update.
vi.mock('../../src/lock.ts', () => ({
  readLock: async () =>
    lockWith({
      'my-skill': skill({ trusted: true }),
      'private-skill': skill({ source: 'other/private', trusted: true }),
    }),
  getGitHubToken: () => 'token',
  fetchSkillFolderHash: async (source: string) => {
    if (source === 'other/private') {
      throw new Error('cannot read other/private from GitHub: HTTP 404 Not Found')
    }
    return 'new-hash'
  },
  addToLock: async () => {},
}))

afterEach(() => {
  process.exitCode = undefined
})

it('updates reachable entries and fails the run for the unreachable one', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck([], { autoUpdate: true })

  expect(getLogs()).toMatchInlineSnapshot(`
    "info: 1 update(s) available:
    message:   * my-skill (owner/repo)
    success: Updated skill: my-skill
    success: Updated 1 item(s)
    error: 1 item(s) could not be checked for updates:
    message:   - private-skill: cannot read other/private from GitHub: HTTP 404 Not Found"
  `)
  expect(process.exitCode).toBe(1)
  expect(mocks.outro).toHaveBeenLastCalledWith('Done, with errors')
})
