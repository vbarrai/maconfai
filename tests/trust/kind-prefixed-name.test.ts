import { it, expect, vi } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, sharedNameLock, trustStates } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

describeConfai('trust / kind prefix', ({ getTargetDir, targetFile }) => {
  it('trusts only the kind named by skill:, mcp: or hook:', async () => {
    await givenLock(getTargetDir(), sharedNameLock)

    await whenTrust(getTargetDir(), ['mcp:linear'])

    expect(trustStates(await targetFile('ai-lock.json'))).toMatchInlineSnapshot(`
      {
        "MCP: linear": true,
        "linear": undefined,
      }
    `)
    expect(getLogs()).toMatchInlineSnapshot(`
      "success: Trusted 1 item(s)
      message:   - MCP: linear"
    `)
  })
})
