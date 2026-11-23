import { it, expect, vi } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, mixedTrustLock, trustStates } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

describeConfai('trust / --all', ({ getTargetDir, targetFile }) => {
  it('trusts every entry of the lock, legacy and explicitly non-trusted alike', async () => {
    await givenLock(getTargetDir(), mixedTrustLock)

    await whenTrust(getTargetDir(), ['--all'])

    expect(trustStates(await targetFile('ai-lock.json'))).toMatchInlineSnapshot(`
      {
        "MCP: linear": true,
        "alpha": true,
        "beta": true,
        "hook: guard": true,
      }
    `)
    expect(getLogs()).toMatchInlineSnapshot(`
      "success: Trusted 3 item(s)
      message:   - alpha
      message:   - beta
      message:   - MCP: linear
      info: Already trusted: hook: guard"
    `)
  })
})
