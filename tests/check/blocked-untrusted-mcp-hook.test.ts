import { it, expect, vi } from 'vitest'
import { getLogs } from './check-test-utils.ts'

// The trust gate applies to MCP servers and hooks too, not only skills.
vi.mock('../../src/lock.ts', () => ({
  readLock: async () => ({
    version: 1,
    skills: {},
    mcpServers: {
      'untrusted-mcp': {
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo',
        folderPath: 'mcps/untrusted-mcp',
        folderHash: 'old-hash',
        trusted: false,
        installedAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    },
    hooks: {
      'untrusted-hook': {
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo',
        folderPath: 'hooks/untrusted-hook',
        folderHash: 'old-hash',
        trusted: false,
        installedAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    },
  }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
}))

it('blocks non-trusted MCP servers and hooks', async () => {
  const { runCheck } = await import('../../src/check.ts')
  await runCheck([], { autoUpdate: true })

  expect(getLogs()).toMatchInlineSnapshot(`
    "warn: 2 item(s) blocked (not trusted) — run maconfai update --include-untrusted to update anyway
    message:   - MCP: untrusted-mcp
    message:   - hook: untrusted-hook"
  `)
})
