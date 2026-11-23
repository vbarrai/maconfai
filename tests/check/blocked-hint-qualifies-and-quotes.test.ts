import { it, expect, vi } from 'vitest'
import { getLogs, lockWith, skill } from './check-test-utils.ts'

// The printed `maconfai trust …` command must work when pasted: a skill name with
// spaces is quoted, and a skill sharing its name with an MCP server, or starting with `-`,
// gets a kind prefix.
const untrusted = () => skill({ trusted: false })
vi.mock('../../src/lock.ts', () => ({
  readLock: async () => ({
    ...lockWith({ 'Fix PR CI': untrusted(), linear: untrusted(), '-dash': untrusted() }),
    mcpServers: {
      linear: {
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo',
        trusted: false,
        installedAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    },
  }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
}))

it('prints a trust command that is safe to paste', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck([], { autoUpdate: true })

  expect(getLogs()).toMatchInlineSnapshot(`
    "warn: 4 item(s) blocked (not trusted):
    message:   - Fix PR CI
    message:   - linear
    message:   - -dash
    message:   - MCP: linear
    info: To keep them updating, run: maconfai trust 'Fix PR CI' skill:linear skill:-dash mcp:linear
    info: To update them once: maconfai update --include-untrusted"
  `)
})
