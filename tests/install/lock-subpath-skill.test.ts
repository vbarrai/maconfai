import { afterEach, expect, it, vi } from 'vitest'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { runInstall } from '../../src/install.ts'
import { commitAll, runGit } from '../git/git-test-utils.ts'
import { skillFile } from '../test-utils.ts'

const dirs: string[] = []
let repoDir = ''

// The "remote" repository is a local git fixture: cloning copies it.
vi.mock('../../src/git.ts', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  return {
    ...original,
    cloneRepo: async () => {
      const clone = await mkdtemp(join(tmpdir(), 'maconfai-subpath-clone-'))
      await cp(repoDir, clone, { recursive: true })
      return clone
    },
  }
})

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

it('records a skill installed from its own sub-path at its repository path and hash', async () => {
  repoDir = await mkdtemp(join(tmpdir(), 'maconfai-subpath-repo-'))
  const targetDir = await mkdtemp(join(tmpdir(), 'maconfai-subpath-target-'))
  dirs.push(repoDir, targetDir)
  await mkdir(join(repoDir, 'skills', 'alpha'), { recursive: true })
  await writeFile(join(repoDir, 'skills', 'alpha', 'SKILL.md'), skillFile('alpha'))
  await commitAll(repoDir)
  const treeHash = await runGit(repoDir, ['rev-parse', 'HEAD:skills/alpha'])

  const originalCwd = process.cwd()
  try {
    process.chdir(targetDir)
    await runInstall([
      'owner/repo/skills/alpha',
      '-y',
      '--agents=claude-code',
      '--hooks=',
      '--mcps=',
    ])
  } finally {
    process.chdir(originalCwd)
  }

  const lock = JSON.parse(await readFile(join(targetDir, 'ai-lock.json'), 'utf8'))
  expect(lock.skills['alpha'].skillPath).toBe('skills/alpha')
  expect(lock.skills['alpha'].skillFolderHash).toBe(treeHash)
})
