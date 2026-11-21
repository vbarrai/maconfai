import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cloneRepo } from '../../src/git.ts'

// A real `git clone` of a GitHub URL that fails. git's error repeats the clone command; the
// error cloneRepo throws (printed by install and update) must not carry the token.
const token = 'not-a-real-token-clone-error-test-000000'

beforeEach(() => {
  vi.stubEnv('GITHUB_TOKEN', token)
  vi.stubEnv('GH_TOKEN', '')
  // Refuse https before any network access: the clone fails offline and deterministically.
  vi.stubEnv('GIT_CONFIG_COUNT', '1')
  vi.stubEnv('GIT_CONFIG_KEY_0', 'protocol.https.allow')
  vi.stubEnv('GIT_CONFIG_VALUE_0', 'never')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('never puts the GitHub token in the error of a failed clone', async () => {
  const error = await cloneRepo('https://github.com/some-org/private-repo.git').catch(
    (err: Error) => err,
  )

  expect(error).toBeInstanceOf(Error)
  const message = (error as Error).message
  expect(message).toContain('Failed to clone https://github.com/some-org/private-repo.git')
  expect(message).toContain('git clone --depth 1 https://github.com/some-org/private-repo.git')
  expect(message).not.toContain(token)
})
