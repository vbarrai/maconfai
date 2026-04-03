import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { execSync } from 'child_process'

const LOCK_FILENAME = 'ai-lock.json'

function lockPath(cwd?: string): string {
  return join(cwd || process.cwd(), LOCK_FILENAME)
}

export interface SkillLockEntry {
  source: string
  sourceUrl: string
  skillPath?: string
  ref?: string
  skillFolderHash: string
  agents?: string[]
  installedAt: string
  updatedAt: string
}

interface McpLockEntry {
  source: string
  sourceUrl: string
  ref?: string
  installedAt: string
  updatedAt: string
}

interface HookLockEntry {
  source: string
  sourceUrl: string
  ref?: string
  installedAt: string
  updatedAt: string
}

interface LockFile {
  version: number
  skills: Record<string, SkillLockEntry>
  mcpServers: Record<string, McpLockEntry>
  hooks: Record<string, HookLockEntry>
}

function emptyLock(): LockFile {
  return { version: 1, skills: {}, mcpServers: {}, hooks: {} }
}

export async function readLock(cwd?: string): Promise<LockFile> {
  try {
    const content = await readFile(lockPath(cwd), 'utf-8')
    const parsed = JSON.parse(content) as LockFile
    if (typeof parsed.version !== 'number' || !parsed.skills) {
      return emptyLock()
    }
    return {
      ...parsed,
      mcpServers: parsed.mcpServers ?? {},
      hooks: parsed.hooks ?? {},
    }
  } catch {
    return emptyLock()
  }
}

export async function writeLock(lock: LockFile, cwd?: string): Promise<void> {
  await writeFile(lockPath(cwd), JSON.stringify(lock, null, 2), 'utf-8')
}

export async function addToLock(
  skillName: string,
  entry: Omit<SkillLockEntry, 'installedAt' | 'updatedAt'>,
  cwd?: string,
): Promise<void> {
  const lock = await readLock(cwd)
  const now = new Date().toISOString()
  const existing = lock.skills[skillName]

  lock.skills[skillName] = {
    ...entry,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
  }

  await writeLock(lock, cwd)
}

export async function addMcpToLock(
  serverName: string,
  entry: Omit<McpLockEntry, 'installedAt' | 'updatedAt'>,
  cwd?: string,
): Promise<void> {
  const lock = await readLock(cwd)
  const now = new Date().toISOString()
  const existing = lock.mcpServers[serverName]

  lock.mcpServers[serverName] = {
    ...entry,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
  }

  await writeLock(lock, cwd)
}

export async function addHookToLock(
  groupName: string,
  entry: Omit<HookLockEntry, 'installedAt' | 'updatedAt'>,
  cwd?: string,
): Promise<void> {
  const lock = await readLock(cwd)
  const now = new Date().toISOString()
  const existing = lock.hooks[groupName]

  lock.hooks[groupName] = {
    ...entry,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
  }

  await writeLock(lock, cwd)
}

export async function removeFromLock(skillName: string, cwd?: string): Promise<void> {
  const lock = await readLock(cwd)
  delete lock.skills[skillName]
  await writeLock(lock, cwd)
}

export function getGitHubToken(): string | null {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN

  try {
    const token = execSync('gh auth token', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return token || null
  } catch {
    return null
  }
}

export async function fetchSkillFolderHash(
  ownerRepo: string,
  skillPath: string,
  token?: string | null,
  ref?: string | null,
): Promise<string | null> {
  let folderPath = skillPath.replace(/\\/g, '/')
  if (folderPath.endsWith('/SKILL.md')) folderPath = folderPath.slice(0, -9)
  else if (folderPath.endsWith('SKILL.md')) folderPath = folderPath.slice(0, -8)
  if (folderPath.endsWith('/')) folderPath = folderPath.slice(0, -1)

  const branches = ref ? [ref] : ['main', 'master']

  for (const branch of branches) {
    try {
      const url = `https://api.github.com/repos/${ownerRepo}/git/trees/${branch}?recursive=1`
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'maconfai',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(url, { headers })
      if (!response.ok) continue

      const data = (await response.json()) as {
        sha: string
        tree: Array<{ path: string; type: string; sha: string }>
      }

      if (!folderPath) return data.sha

      const entry = data.tree.find((e) => e.type === 'tree' && e.path === folderPath)
      if (entry) return entry.sha
    } catch {
      continue
    }
  }

  return null
}
