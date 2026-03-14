import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const LOCK_PATH = join(homedir(), '.agents', '.skill-lock.json')

export interface SkillLockEntry {
  source: string
  sourceUrl: string
  skillPath?: string
  ref?: string
  skillFolderHash: string
  installedAt: string
  updatedAt: string
  mcpServers?: string[]
}

interface SkillLockFile {
  version: number
  skills: Record<string, SkillLockEntry>
}

export async function readLock(): Promise<SkillLockFile> {
  try {
    const content = await readFile(LOCK_PATH, 'utf-8')
    const parsed = JSON.parse(content) as SkillLockFile
    if (typeof parsed.version !== 'number' || !parsed.skills) {
      return { version: 1, skills: {} }
    }
    return parsed
  } catch {
    return { version: 1, skills: {} }
  }
}

async function writeLock(lock: SkillLockFile): Promise<void> {
  await mkdir(dirname(LOCK_PATH), { recursive: true })
  await writeFile(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf-8')
}

async function addToLock(
  skillName: string,
  entry: Omit<SkillLockEntry, 'installedAt' | 'updatedAt'>,
): Promise<void> {
  const lock = await readLock()
  const now = new Date().toISOString()
  const existing = lock.skills[skillName]

  lock.skills[skillName] = {
    ...entry,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
  }

  await writeLock(lock)
}

export async function removeFromLock(skillName: string): Promise<void> {
  const lock = await readLock()
  delete lock.skills[skillName]
  await writeLock(lock)
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
