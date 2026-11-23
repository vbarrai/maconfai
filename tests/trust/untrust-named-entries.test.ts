import { it, expect, vi } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenUntrust, mixedTrustLock, trustStates } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

describeConfai('untrust / named entries', ({ getTargetDir, targetFile, targetFiles }) => {
  it('writes trusted: false on the named entries only, without installing anything', async () => {
    await givenLock(getTargetDir(), mixedTrustLock)

    await whenUntrust(getTargetDir(), ['hook:guard', 'alpha', 'linear'])

    expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        "ai-lock.json",
      ]
    `)
    // A missing field becomes an explicit false; beta is not named and keeps no field
    expect(trustStates(await targetFile('ai-lock.json'))).toMatchInlineSnapshot(`
      {
        "MCP: linear": false,
        "alpha": false,
        "beta": undefined,
        "hook: guard": false,
      }
    `)
    const guard = JSON.parse(await targetFile('ai-lock.json')).hooks.guard
    expect(guard).toMatchInlineSnapshot(`
      {
        "installedAt": "2026-05-01T00:00:00.000Z",
        "source": "owner/hub",
        "sourceUrl": "https://github.com/owner/hub.git",
        "trusted": false,
        "updatedAt": "2026-05-01T00:00:00.000Z",
      }
    `)
    expect(getLogs()).toMatchInlineSnapshot(`
      "success: Untrusted 2 item(s)
      message:   - hook: guard
      message:   - alpha
      info: Already not trusted: MCP: linear"
    `)
  })
})
