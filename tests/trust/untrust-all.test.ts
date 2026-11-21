import { it, expect, vi } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenUntrust, mixedTrustLock, trustStates } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

describeConfai('untrust / --all', ({ getTargetDir, targetFile }) => {
  it('marks every skill, MCP and hook in the lock as not trusted', async () => {
    await givenLock(getTargetDir(), mixedTrustLock)

    await whenUntrust(getTargetDir(), ['--all'])

    expect(trustStates(await targetFile('ai-lock.json'))).toMatchInlineSnapshot(`
      {
        "MCP: linear": false,
        "alpha": false,
        "beta": false,
        "hook: guard": false,
      }
    `)
    expect(getLogs()).toMatchInlineSnapshot(`
      "success: Untrusted 3 item(s)
      message:   - alpha
      message:   - beta
      message:   - hook: guard
      info: Already not trusted: MCP: linear"
    `)
  })
})
