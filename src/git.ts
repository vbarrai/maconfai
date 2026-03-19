import { execFile } from 'child_process'
import { join, normalize, resolve, sep } from 'path'
import { mkdtemp, rm } from 'fs/promises'
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

export async function cleanupTempDir(dir: string): Promise<void> {
  const normalizedDir = normalize(resolve(dir))
  const normalizedTmp = normalize(resolve(tmpdir()))

  if (!normalizedDir.startsWith(normalizedTmp + sep) && normalizedDir !== normalizedTmp) {
    throw new Error('Attempted to clean up directory outside of temp directory')
  }

  await rm(dir, { recursive: true, force: true })
}
