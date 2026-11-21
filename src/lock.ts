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
  trusted?: boolean
  installedAt: string
  updatedAt: string
}

export interface McpLockEntry {
  source: string
  sourceUrl: string
  folderPath?: string
  folderHash?: string
  ref?: string
  agents?: string[]
  trusted?: boolean
  installedAt: string
  updatedAt: string
}

export interface HookLockEntry {
  source: string
  sourceUrl: string
  folderPath?: string
  folderHash?: string
  ref?: string
  agents?: string[]
  trusted?: boolean
  installedAt: string
  updatedAt: string
  handlers?: Record<string, unknown>
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

  const hashChanged = !existing || existing.skillFolderHash !== entry.skillFolderHash

  lock.skills[skillName] = {
    ...entry,
    // Preserve trust when the caller (e.g. update) does not specify it
    trusted: entry.trusted ?? existing?.trusted,
    installedAt: existing?.installedAt ?? now,
    updatedAt: hashChanged ? now : existing!.updatedAt,
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

  const mcpHashChanged = !existing || existing.folderHash !== entry.folderHash

  lock.mcpServers[serverName] = {
    ...entry,
    // Preserve trust when the caller (e.g. update) does not specify it
    trusted: entry.trusted ?? existing?.trusted,
    installedAt: existing?.installedAt ?? now,
    updatedAt: mcpHashChanged ? now : existing!.updatedAt,
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

  const hookHashChanged = !existing || existing.folderHash !== entry.folderHash

  lock.hooks[groupName] = {
    ...entry,
    // Preserve trust when the caller (e.g. update) does not specify it
    trusted: entry.trusted ?? existing?.trusted,
    installedAt: existing?.installedAt ?? now,
    updatedAt: hookHashChanged ? now : existing!.updatedAt,
  }

  await writeLock(lock, cwd)
}

export async function removeFromLock(skillName: string, cwd?: string): Promise<void> {
  const lock = await readLock(cwd)
  delete lock.skills[skillName]
  await writeLock(lock, cwd)
}

export async function removeMcpFromLock(serverName: string, cwd?: string): Promise<void> {
  const lock = await readLock(cwd)
  delete lock.mcpServers[serverName]
  await writeLock(lock, cwd)
}

export async function removeHookFromLock(groupName: string, cwd?: string): Promise<void> {
  const lock = await readLock(cwd)
  delete lock.hooks[groupName]
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

// One GitHub tree, read once: either the tree, or why it could not be read.
export type TreeFetch =
  | { ok: true; sha: string; tree: Array<{ path: string; type: string; sha: string }> }
  | { ok: false; status?: number; reason: string }

async function fetchTree(
  ownerRepo: string,
  branch: string,
  token?: string | null,
): Promise<TreeFetch> {
  try {
    const url = `https://api.github.com/repos/${ownerRepo}/git/trees/${branch}?recursive=1`
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'maconfai',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(url, { headers })
    if (!response.ok) {
      const rateLimited = response.headers.get('x-ratelimit-remaining') === '0'
      return {
        ok: false,
        status: response.status,
        reason: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}${rateLimited ? ' (rate limit exceeded)' : ''}`,
      }
    }
    const data = (await response.json()) as Omit<Extract<TreeFetch, { ok: true }>, 'ok'>
    return { ok: true, sha: data.sha, tree: data.tree }
  } catch (err) {
    return {
      ok: false,
      reason: `network error: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function fetchSkillFolderHash(
  ownerRepo: string,
  skillPath: string,
  token?: string | null,
  ref?: string | null,
  // Shared by the caller across entries, so a source with 40 entries costs one request per
  // branch instead of 40 (an unauthenticated client only gets 60 requests an hour).
  treeCache?: Map<string, Promise<TreeFetch>>,
): Promise<string | null> {
  let folderPath = skillPath.replace(/\\/g, '/')
  if (folderPath.endsWith('/SKILL.md')) folderPath = folderPath.slice(0, -9)
  else if (folderPath.endsWith('SKILL.md')) folderPath = folderPath.slice(0, -8)
  if (folderPath.endsWith('/')) folderPath = folderPath.slice(0, -1)

  // HEAD is the repository's default branch: tried last, for a source whose default
  // branch is neither main nor master (develop, trunk…).
  const branches = ref ? [ref] : ['main', 'master', 'HEAD']
  // Why each branch could not be read. Without a single readable tree the hash is unknown,
  // and the caller must not take that for "up to date" (a bad token, a rate limit or a
  // network failure used to look exactly like a current entry).
  const failures: Array<{ status?: number; reason: string }> = []
  let treeRead = false

  for (const branch of branches) {
    // main or master was readable: HEAD is one of them, nothing more to learn.
    if (branch === 'HEAD' && treeRead) break

    const key = `${ownerRepo}@${branch}`
    let pending = treeCache?.get(key)
    if (!pending) {
      pending = fetchTree(ownerRepo, branch, token)
      treeCache?.set(key, pending)
    }
    const result = await pending
    if (!result.ok) {
      failures.push(result)
      continue
    }
    treeRead = true

    if (!folderPath) return result.sha

    const entry = result.tree.find(
      (e) => (e.type === 'tree' || e.type === 'blob') && e.path === folderPath,
    )
    if (entry) return entry.sha
  }

  // A readable tree without the folder: the source no longer has it, not an access problem.
  if (treeRead) return null

  // A 404 on one branch only means that branch does not exist; report the more telling
  // failure (401 bad token, 403 rate limit, network) when there is one.
  const failure = failures.find((f) => f.status !== 404) ?? failures[failures.length - 1]!
  const hint =
    failure.status === 401
      ? ' — check GITHUB_TOKEN / GH_TOKEN'
      : failure.status === 403 && failure.reason.includes('rate limit')
        ? ' — set GITHUB_TOKEN or run gh auth login for a higher limit'
        : failure.status === 403
          ? ' — the token cannot read this repository (SSO authorization or repository permission)'
          : failure.status === 404
            ? ` — repository or ref (${ref ?? 'default branch'}) not found, or private without access (set GITHUB_TOKEN or run gh auth login)`
            : ''
  throw new Error(`cannot read ${ownerRepo} from GitHub: ${failure.reason}${hint}`)
}
