import { it, expect, vi, afterEach } from 'vitest'
import { getLogs } from './check-test-utils.ts'

// The same rule holds for MCP servers and hooks, not only skills.
vi.mock('../../src/lock.ts', () => {
  const entry = (folderPath: string) => ({
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    folderPath,
    folderHash: 'old-hash',
    trusted: true,
    installedAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  })
  return {
    readLock: async () => ({
      version: 1,
      skills: {},
      mcpServers: { linear: entry('mcps/linear') },
      hooks: { guard: entry('hooks/guard') },
    }),
    getGitHubToken: () => null,
    fetchSkillFolderHash: async () => {
      throw new Error('cannot read owner/repo from GitHub: network error: fetch failed')
    },
  }
})

afterEach(() => {
  process.exitCode = undefined
})

it('reports MCP servers and hooks whose hash cannot be read', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck([], { autoUpdate: true })

  expect(getLogs()).toMatchInlineSnapshot(`
    "error: 2 item(s) could not be checked for updates:
    message:   - MCP: linear: cannot read owner/repo from GitHub: network error: fetch failed
    message:   - hook: guard: cannot read owner/repo from GitHub: network error: fetch failed"
  `)
  expect(process.exitCode).toBe(1)
})
