import { it, expect, vi } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, mixedTrustLock, trustStates } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

// `update` prints `skill:-legacy` for a skill whose name starts with `-`: a bare `-legacy`
// would be read as a flag, so the prefixed form is what must work.
const lock = {
  ...mixedTrustLock,
  skills: { '-legacy': { ...mixedTrustLock.skills.alpha, skillPath: 'skills/-legacy/SKILL.md' } },
}

describeConfai('trust / name starting with a dash', ({ getTargetDir, targetFile }) => {
  it('trusts a skill named -legacy through skill:-legacy', async () => {
    await givenLock(getTargetDir(), lock)

    await whenTrust(getTargetDir(), ['skill:-legacy'])

    expect(trustStates(await targetFile('ai-lock.json'))).toMatchInlineSnapshot(`
      {
        "-legacy": true,
        "MCP: linear": false,
        "hook: guard": true,
      }
    `)
    expect(getLogs()).toMatchInlineSnapshot(`
      "success: Trusted 1 item(s)
      message:   - -legacy"
    `)
  })
})
