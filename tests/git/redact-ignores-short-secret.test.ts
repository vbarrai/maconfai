import { expect, it } from 'vitest'
import { redactCredentials } from '../../src/git.ts'

// A placeholder token (`GITHUB_TOKEN=x`) must not mask every "x" of the message.
it('leaves the message readable when the secret is a short placeholder', () => {
  expect(
    redactCredentials('fatal: repository https://github.com/x-org/xyz.git not found', ['x']),
  ).toMatchInlineSnapshot(`"fatal: repository https://github.com/x-org/xyz.git not found"`)
})
