import { afterEach, expect, it } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { getTreeHash } from '../../src/git.ts'
import { createGitFixture } from './git-test-utils.ts'

const fixtureDirs: string[] = []

afterEach(async () => {
  await Promise.all(fixtureDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

// install runs getTreeHash from the sub-path of the clone with a repository-root path.
it('resolves a repository-root path from a sub-path working directory', async () => {
  const fixtureDir = await createGitFixture()
  fixtureDirs.push(fixtureDir)

  const fromRoot = await getTreeHash(fixtureDir, 'nested')
  const fromSubpath = await getTreeHash(join(fixtureDir, 'nested'), 'nested')

  expect(fromRoot).toMatch(/^[0-9a-f]{40}$/)
  expect(fromSubpath).toBe(fromRoot)
})
