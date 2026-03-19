import { simpleGit } from 'simple-git'
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

export async function cloneRepo(url: string, ref?: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'maconfai-'))
  const git = simpleGit({
    timeout: { block: CLONE_TIMEOUT_MS },
  })

  try {
    const opts = ref ? ['--depth', '1', '--branch', ref] : ['--depth', '1']
    await git.clone(injectToken(url), tempDir, opts)
    return tempDir
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to clone ${url}: ${msg}`)
  }
}

export async function getTreeHash(repoDir: string, folderPath: string): Promise<string> {
  const git = simpleGit(repoDir)
  const treePath = folderPath.replace(/\\/g, '/').replace(/\/$/, '')
  const result = await git.revparse([`HEAD:${treePath}`])
  return result.trim()
}

export async function cleanupTempDir(dir: string): Promise<void> {
  const normalizedDir = normalize(resolve(dir))
  const normalizedTmp = normalize(resolve(tmpdir()))

  if (!normalizedDir.startsWith(normalizedTmp + sep) && normalizedDir !== normalizedTmp) {
    throw new Error('Attempted to clean up directory outside of temp directory')
  }

  await rm(dir, { recursive: true, force: true })
}
