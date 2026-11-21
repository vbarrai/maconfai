import { it, expect, vi } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, mixedTrustLock, trustStates } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

describeConfai('trust / named entries', ({ getTargetDir, targetFile, targetFiles }) => {
  it('trusts only the named skills, MCPs and hooks, without installing anything', async () => {
    await givenLock(getTargetDir(), mixedTrustLock)

    await whenTrust(getTargetDir(), ['alpha', 'linear', 'guard'])

    // Only the lock is touched: no skill, MCP or hook file is written
    expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        "ai-lock.json",
      ]
    `)
    expect(trustStates(await targetFile('ai-lock.json'))).toMatchInlineSnapshot(`
      {
        "MCP: linear": true,
        "alpha": true,
        "beta": undefined,
        "hook: guard": true,
      }
    `)
    const alpha = JSON.parse(await targetFile('ai-lock.json')).skills.alpha
    expect(alpha).toMatchInlineSnapshot(`
      {
        "installedAt": "2026-05-01T00:00:00.000Z",
        "skillFolderHash": "a1",
        "skillPath": "skills/alpha/SKILL.md",
        "source": "owner/hub",
        "sourceUrl": "https://github.com/owner/hub.git",
        "trusted": true,
        "updatedAt": "2026-05-01T00:00:00.000Z",
      }
    `)
    expect(getLogs()).toMatchInlineSnapshot(`
      "success: Trusted 2 item(s)
      message:   - alpha
      message:   - MCP: linear
      info: Already trusted: hook: guard"
    `)
  })
})
