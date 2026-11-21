import { expect, it } from 'vitest'
import { redactCredentials } from '../../src/git.ts'

it('hides URL credentials and known secrets, and leaves the rest untouched', () => {
  const token = 'not-a-real-token-000'
  const gitError = [
    `Command failed: git clone --depth 1 https://x-access-token:${token}@github.com/org/repo.git /tmp/x`,
    `fatal: Authentication failed for 'https://github.com/org/repo.git/'`,
    `token echoed alone: ${token}`,
    'http://user@host.example/path, ssh://git:pw@host:22/repo',
    'no credentials: https://github.com/org/repo@v1 and git@github.com:org/repo.git',
  ].join('\n')

  expect(redactCredentials(gitError, [token, null])).toMatchInlineSnapshot(`
    "Command failed: git clone --depth 1 https://***@github.com/org/repo.git /tmp/x
    fatal: Authentication failed for 'https://github.com/org/repo.git/'
    token echoed alone: ***
    http://***@host.example/path, ssh://***@host:22/repo
    no credentials: https://github.com/org/repo@v1 and git@github.com:org/repo.git"
  `)
})
