import { vi } from 'vitest'
import {
  mocks,
  mockCloneRepo,
  mockCleanupTempDir,
  mockGetTreeHash,
  mockDiscoverSkills,
  mockInstallSkill,
  mockAddToLock,
  mockParseSource,
  mockGetOwnerRepo,
} from './check-test-utils.ts'

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
}))
vi.mock('../../src/skills.ts', () => ({
  discoverSkills: (basePath: string) => mockDiscoverSkills(basePath),
}))
vi.mock('../../src/installer.ts', () => ({
  installSkill: (skill: unknown, agent: unknown, opts: unknown) =>
    mockInstallSkill(skill, agent, opts),
}))
