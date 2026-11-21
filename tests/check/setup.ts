import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, vi } from 'vitest'
import {
  mocks,
  mockCloneRepo,
  mockCleanupTempDir,
  mockGetTreeHash,
  mockDiscoverSkills,
  mockDiscoverMcpServers,
  mockDiscoverMcpDirs,
  mockDiscoverHooks,
  mockDiscoverHookDirs,
  mockInstallSkill,
  mockInstallMcpServers,
  mockInstallHooks,
  mockInstallHookFiles,
  mockAddToLock,
  mockAddMcpToLock,
  mockAddHookToLock,
  mockParseSource,
  mockGetOwnerRepo,
  mockDetectProjectAgents,
} from './check-test-utils.ts'

// `check` looks at the agent dirs of the current directory (is a tracked skill still
// there?): run from an empty one, so the repository's own .claude/ is never taken for
// the project under test.
const emptyCwd = mkdtempSync(join(tmpdir(), 'maconfai-check-cwd-'))
const originalCwd = process.cwd()
process.chdir(emptyCwd)
afterAll(() => {
  process.chdir(originalCwd)
  rmSync(emptyCwd, { recursive: true, force: true })
})

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)
vi.mock('../../src/source-parser.ts', () => ({
  parseSource: (input: string) => mockParseSource(input),
  getOwnerRepo: (parsed: unknown) => mockGetOwnerRepo(parsed),
}))
vi.mock('../../src/git.ts', () => ({
  cloneRepo: (url: string, ref?: string) => mockCloneRepo(url, ref),
  cleanupTempDir: (dir: string) => mockCleanupTempDir(dir),
  getTreeHash: (repoDir: string, folderPath: string) => mockGetTreeHash(repoDir, folderPath),
  getLocalTreeHash: (baseDir: string, folderPath: string) => mockGetTreeHash(baseDir, folderPath),
}))
vi.mock('../../src/skills.ts', () => ({
  discoverSkills: (basePath: string) => mockDiscoverSkills(basePath),
  discoverMcpServers: (basePath: string) => mockDiscoverMcpServers(basePath),
  discoverMcpDirs: (basePath: string) => mockDiscoverMcpDirs(basePath),
  discoverHooks: (basePath: string) => mockDiscoverHooks(basePath),
  discoverHookDirs: (basePath: string) => mockDiscoverHookDirs(basePath),
}))
vi.mock('../../src/installer.ts', () => ({
  installSkill: (skill: unknown, agent: unknown, opts: unknown) =>
    mockInstallSkill(skill, agent, opts),
  sanitizeName: (name: string) => name,
}))
vi.mock('../../src/mcp.ts', () => ({
  installMcpServers: (servers: unknown, agent: unknown, opts?: unknown) =>
    mockInstallMcpServers(servers, agent, opts),
}))
vi.mock('../../src/hooks.ts', () => ({
  installHooks: (events: unknown, agent: unknown, opts?: unknown) =>
    mockInstallHooks(events, agent, opts),
  installHookFiles: (src: unknown, name: unknown) => mockInstallHookFiles(src, name),
}))
vi.mock('../../src/agents.ts', () => ({
  agents: {
    'claude-code': { skillsDir: '.claude/skills', displayName: 'Claude Code' },
    cursor: { skillsDir: '.cursor/skills', displayName: 'Cursor' },
    codex: { skillsDir: '.codex/skills', displayName: 'Codex' },
    'open-code': { skillsDir: '.opencode/skills', displayName: 'Open Code' },
  },
  detectProjectAgents: () => mockDetectProjectAgents(),
}))
