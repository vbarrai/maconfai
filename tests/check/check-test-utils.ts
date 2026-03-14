import { vi } from 'vitest'
import type { SkillLockEntry, SkillLockFile } from '../../src/lock.ts'

export type LogCall = { method: string; args: string[] }

export function setupCheckMocks() {
  const logs: LogCall[] = []

  const mockLog = (method: string) =>
    vi.fn((...args: any[]) => {
      logs.push({ method, args: args.map(String) })
    })

  const mocks = {
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
    confirm: vi.fn(async () => false),
    isCancel: vi.fn(() => false),
  }

  function getLogs(): string {
    return logs.map((l) => `${l.method}: ${l.args.join(' ')}`).join('\n')
  }

  return { mocks, getLogs }
}

export function lockWith(skills: Record<string, Partial<SkillLockEntry>>): SkillLockFile {
  return { version: 1, skills: skills as Record<string, SkillLockEntry> }
}

export function skill(overrides: Partial<SkillLockEntry> = {}): Partial<SkillLockEntry> {
  return {
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    skillPath: 'skills/my-skill/SKILL.md',
    skillFolderHash: 'abc123',
    installedAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}
