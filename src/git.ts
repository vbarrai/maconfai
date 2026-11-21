import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { join, normalize, resolve, sep } from 'path'
import { lstat, mkdtemp, readdir, readFile, readlink, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { getGitHubToken } from './lock.ts'

const CLONE_TIMEOUT_MS = 60_000

function injectToken(url: string): string {
  const token = getGitHubToken()
  if (!token) return url

  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'github.com' && !parsed.username) {
      parsed.username = 'x-access-token'
      parsed.password = token
      return parsed.toString()
    }
  } catch {}

  return url
}

function gitExec(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile('git', args, { timeout: CLONE_TIMEOUT_MS }, (error) => {
      if (error) reject(error)
      else resolve()
    })
    child.unref?.()
  })
}

export async function cloneRepo(url: string, ref?: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'maconfai-'))

  try {
    const args = ['clone', '--depth', '1']
    if (ref) args.push('--branch', ref)
    args.push(injectToken(url), tempDir)
    await gitExec(args)
    return tempDir
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to clone ${url}: ${msg}`)
  }
}

export function getTreeHash(repoDir: string, folderPath: string): Promise<string> {
  const treePath = folderPath.replace(/\\/g, '/').replace(/\/$/, '')
  return new Promise((resolve, reject) => {
    execFile('git', ['rev-parse', `HEAD:${treePath}`], { cwd: repoDir }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout.trim())
    })
  })
}

type GitTreeEntry = { mode: string; sha: Buffer }

function gitObjectSha(type: 'blob' | 'tree', body: Buffer): Buffer {
  return createHash('sha1').update(`${type} ${body.length}\0`).update(body).digest()
}

async function hashGitObject(path: string): Promise<GitTreeEntry | null> {
  const stats = await lstat(path)
  if (stats.isSymbolicLink()) {
    return { mode: '120000', sha: gitObjectSha('blob', Buffer.from(await readlink(path))) }
  }
  if (stats.isFile()) {
    const mode = stats.mode & 0o100 ? '100755' : '100644'
    return { mode, sha: gitObjectSha('blob', await readFile(path)) }
  }
  if (!stats.isDirectory()) return null

  const children: Array<GitTreeEntry & { name: string }> = []
  for (const name of await readdir(path)) {
    // Never part of a committed skill: keep the hash equal to git's for a clean checkout
    if (name === '.git' || name === '.DS_Store' || name === 'node_modules') continue
    const child = await hashGitObject(join(path, name))
    if (child) children.push({ name, ...child })
  }
  // git does not track an empty directory
  if (children.length === 0) return null

  // git orders tree entries by name, a subtree compared as if it ended with `/`
  const sortKey = (e: { name: string; mode: string }) =>
    Buffer.from(e.mode === '40000' ? `${e.name}/` : e.name)
  children.sort((a, b) => Buffer.compare(sortKey(a), sortKey(b)))
  const body = Buffer.concat(children.flatMap((e) => [Buffer.from(`${e.mode} ${e.name}\0`), e.sha]))
  return { mode: '40000', sha: gitObjectSha('tree', body) }
}

/**
 * Same hash as `getTreeHash`, computed from the files on disk instead of a commit: what a
 * local source holds right now, committed or not, and whether or not it is a git repo.
 * For a clean checkout it equals the committed tree hash, so locks written from it stay valid.
 */
export async function getLocalTreeHash(baseDir: string, folderPath: string): Promise<string> {
  const target = join(baseDir, folderPath.replace(/\\/g, '/').replace(/\/$/, ''))
  const entry = await hashGitObject(target)
  if (!entry) throw new Error(`Nothing to hash at ${target}`)
  return entry.sha.toString('hex')
}

export async function cleanupTempDir(dir: string): Promise<void> {
  const normalizedDir = normalize(resolve(dir))
  const normalizedTmp = normalize(resolve(tmpdir()))

  if (!normalizedDir.startsWith(normalizedTmp + sep) && normalizedDir !== normalizedTmp) {
    throw new Error('Attempted to clean up directory outside of temp directory')
  }

  await rm(dir, { recursive: true, force: true })
}
