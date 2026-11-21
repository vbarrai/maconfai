import { chmod, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cloneRepo } from '../../src/git.ts'

// The token must never be in git's arguments (visible in `ps`) nor in the clone URL (written to
// .git/config): a stand-in `git` on PATH records what cloneRepo hands it.
const token = 'not-a-real-token-argv-test-0000000000000'
let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'maconfai-fake-git-'))
  await writeFile(
    join(dir, 'git'),
    `#!/bin/sh\nprintf '%s\\n' "$@" > "${dir}/argv"\nenv | grep '^GIT_CONFIG' | sort > "${dir}/env"\nexit 1\n`,
  )
  await chmod(join(dir, 'git'), 0o755)
  vi.stubEnv('PATH', `${dir}:${process.env.PATH}`)
  vi.stubEnv('GITHUB_TOKEN', token)
  vi.stubEnv('GH_TOKEN', '')
  vi.stubEnv('GIT_CONFIG_COUNT', '')
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(dir, { recursive: true, force: true })
})

it('passes the token as an HTTP header through the environment, not in the URL', async () => {
  await cloneRepo('https://github.com/owner/repo.git').catch(() => {})

  const argv = await readFile(join(dir, 'argv'), 'utf-8')
  expect(argv).not.toContain(token)
  expect(argv).toContain('https://github.com/owner/repo.git')
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64')
  expect(await readFile(join(dir, 'env'), 'utf-8')).toBe(
    [
      'GIT_CONFIG_COUNT=1',
      'GIT_CONFIG_KEY_0=http.https://github.com/.extraheader',
      `GIT_CONFIG_VALUE_0=AUTHORIZATION: basic ${basic}`,
      '',
    ].join('\n'),
  )
})
