import { type Mock, vi } from 'vitest'
import type { SkillLockEntry } from '../../src/lock.ts'

export type LogCall = { method: string; args: string[] }

const logs: LogCall[] = []

const mockLog = (method: string) =>
  vi.fn((...args: any[]) => {
    logs.push({ method, args: args.map(String) })
  })

export const mocks: {
  intro: Mock
  outro: Mock
  spinner: () => { start: Mock; stop: Mock }
  log: { info: Mock; success: Mock; message: Mock; warn: Mock; error: Mock }
  confirm: Mock
  isCancel: Mock
} = {
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
  log: {
    info: mockLog('info'),
    success: mockLog('success'),
    message: mockLog('message'),
    warn: mockLog('warn'),
    error: mockLog('error'),
  },
  confirm: vi.fn(async () => false) as Mock,
  isCancel: vi.fn(() => false),
}

export const mockParseSource = vi.fn((_url: string) => ({
  type: 'github' as const,
  url: _url.replace(/\.git$/, '').replace(/\/$/, ''),
  localPath: undefined as string | undefined,
  ref: undefined as string | undefined,
  subpath: undefined as string | undefined,
}))

export const mockGetOwnerRepo = vi.fn((_parsed: unknown) => 'owner/repo')

export const mockCloneRepo = vi.fn(async (_url: string, _ref?: string) => '/tmp/maconfai-mock')

export const mockCleanupTempDir = vi.fn(async (_dir: string) => {})

export const mockGetTreeHash = vi.fn(
  async (_repoDir: string, _folderPath: string) => 'new-tree-hash',
)

export const mockDiscoverSkills = vi.fn(async (_basePath: string) => [
  { name: 'my-skill', description: 'A test skill', dir: '/tmp/maconfai-mock/skills/my-skill' },
])

export const mockInstallSkill = vi.fn(async (_skill: unknown, _agent: unknown, _opts: unknown) => ({
  success: true as boolean,
}))

export const mockAddToLock = vi.fn(async (_name: string, _entry: unknown, _cwd?: string) => {})

export function getLogs(): string {
  return logs.map((l) => `${l.method}: ${l.args.join(' ')}`).join('\n')
}

export function lockWith(skills: Record<string, Partial<SkillLockEntry>>): {
  version: number
  skills: Record<string, SkillLockEntry>
  mcpServers: Record<string, never>
  hooks: Record<string, never>
} {
  return { version: 1, skills: skills as Record<string, SkillLockEntry>, mcpServers: {}, hooks: {} }
}

export function skill(overrides: Partial<SkillLockEntry> = {}): Partial<SkillLockEntry> {
  return {
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    skillPath: 'skills/my-skill/SKILL.md',
    skillFolderHash: 'abc123',
    agents: ['claude-code'],
    installedAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}
