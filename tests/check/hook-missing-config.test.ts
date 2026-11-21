import { it, expect, vi } from 'vitest'
import {
  getLogs,
  mockAddHookToLock,
  mockDiscoverHookDirs,
  mockInstallHooks,
} from './check-test-utils.ts'

const handler = { matcher: 'Bash', hooks: [{ type: 'command', command: 'guard.sh' }] }

// Codex's hooks config is absent from the directory the test runs in.
vi.mock('../../src/agents.ts', () => ({
  agents: {
    codex: {
      skillsDir: '.codex/skills',
      displayName: 'Codex',
      hooksConfigPath: '.missing-agent-dir/hooks.json',
    },
  },
  detectProjectAgents: () => [],
}))
vi.mock('../../src/lock.ts', () => ({
  readLock: async () => ({
    version: 1,
    skills: {},
    mcpServers: {},
    hooks: {
      guard: {
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo',
        folderPath: 'hooks/guard',
        folderHash: 'same-hash',
        agents: ['codex'],
        // Recorded by a version that wrote nothing for this agent: its hooks config is absent.
        handlers: { codex: { PreToolUse: [handler] } },
        installedAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    },
  }),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'same-hash',
  addHookToLock: (name: string, entry: unknown) => mockAddHookToLock(name, entry),
}))

it('re-installs a hook whose recorded agent has no hooks config on disk, even at the same hash', async () => {
  mockDiscoverHookDirs.mockResolvedValue({
    guard: {
      group: { codex: { PreToolUse: [handler] } },
      dirPath: '/tmp/maconfai-mock/hooks/guard',
    },
  })

  const { runCheck } = await import('../../src/check.ts')
  await runCheck([], { autoUpdate: true })

  expect(mockInstallHooks).toHaveBeenCalledWith({ PreToolUse: [handler] }, 'codex', { force: true })
  expect(getLogs()).toContain('success: Updated hook: guard')
})
