import { writeFile } from 'fs/promises'
import { join } from 'path'

const entry = (source: string) => ({
  source,
  sourceUrl: `https://github.com/${source}.git`,
  installedAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
})

// A lock with every trust state: two legacy skills (no trusted field), an explicitly
// non-trusted MCP server and an already trusted hook.
export const mixedTrustLock = {
  version: 1,
  skills: {
    alpha: { ...entry('owner/hub'), skillPath: 'skills/alpha/SKILL.md', skillFolderHash: 'a1' },
    beta: { ...entry('owner/hub'), skillPath: 'skills/beta/SKILL.md', skillFolderHash: 'b1' },
  },
  mcpServers: { linear: { ...entry('owner/hub'), trusted: false } },
  hooks: { guard: { ...entry('owner/hub'), trusted: true } },
}

export async function givenLock(dir: string, lock: unknown): Promise<void> {
  await writeFile(join(dir, 'ai-lock.json'), JSON.stringify(lock, null, 2))
}

export async function whenTrust(dir: string, args: string[]): Promise<void> {
  const { runTrust } = await import('../../src/trust.ts')
  await inDir(dir, () => runTrust(args))
}

export async function whenUntrust(dir: string, args: string[]): Promise<void> {
  const { runUntrust } = await import('../../src/trust.ts')
  await inDir(dir, () => runUntrust(args))
}

export async function inDir(dir: string, run: () => Promise<void>): Promise<void> {
  const originalCwd = process.cwd()
  try {
    process.chdir(dir)
    await run()
  } finally {
    process.chdir(originalCwd)
  }
}

// Only the `trusted` field of each entry, keyed like the update report
export function trustStates(raw: string): Record<string, unknown> {
  const lock = JSON.parse(raw)
  const states: Record<string, unknown> = {}
  for (const [name, e] of Object.entries<any>(lock.skills)) states[name] = e.trusted
  for (const [name, e] of Object.entries<any>(lock.mcpServers)) states[`MCP: ${name}`] = e.trusted
  for (const [name, e] of Object.entries<any>(lock.hooks)) states[`hook: ${name}`] = e.trusted
  return states
}

// A skill and an MCP server sharing the name `linear`, as in many hubs
export const sharedNameLock = {
  version: 1,
  skills: {
    linear: { ...entry('owner/hub'), skillPath: 'skills/linear/SKILL.md', skillFolderHash: 'l1' },
  },
  mcpServers: { linear: { ...entry('owner/hub') } },
  hooks: {},
}
