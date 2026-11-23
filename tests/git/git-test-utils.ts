import { execFile as execFileCallback } from 'child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { promisify } from 'util'
import { join } from 'path'
import { tmpdir } from 'os'

const execFile = promisify(execFileCallback)

export async function runGit(repoDir: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFile('git', args, { cwd: repoDir })
    return stdout.trim()
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error ? String(error.stderr).trim() : ''
    const details = stderr ? `\n${stderr}` : ''
    throw new Error(`Git command failed: git ${args.join(' ')}${details}`, { cause: error })
  }
}

// Turns `repoDir` into a git repository with one commit holding everything in it.
export async function commitAll(repoDir: string): Promise<void> {
  await runGit(repoDir, ['init'])
  await runGit(repoDir, ['config', 'user.email', 'maconfai-tests@example.com'])
  await runGit(repoDir, ['config', 'user.name', 'maconfai tests'])
  await runGit(repoDir, ['config', 'commit.gpgsign', 'false'])
  await runGit(repoDir, ['add', '.'])
  await runGit(repoDir, ['commit', '-m', 'initial'])
}

// A repository with a `nested/` folder, committed.
export async function createGitFixture(): Promise<string> {
  const repoDir = await mkdtemp(join(tmpdir(), 'maconfai-git-test-'))

  try {
    await mkdir(join(repoDir, 'nested'))
    await writeFile(join(repoDir, 'README.md'), 'main branch\n')
    await writeFile(join(repoDir, 'nested', 'content.txt'), 'nested content\n')
    await commitAll(repoDir)
    return repoDir
  } catch (error) {
    await rm(repoDir, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}
