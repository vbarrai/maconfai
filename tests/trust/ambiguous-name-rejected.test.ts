import { it, expect, vi, afterEach } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, sharedNameLock } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

afterEach(() => {
  process.exitCode = undefined
})

describeConfai('trust / ambiguous name', ({ getTargetDir, targetFile }) => {
  it('refuses a bare name shared by a skill and an MCP server, and writes nothing', async () => {
    await givenLock(getTargetDir(), sharedNameLock)

    await whenTrust(getTargetDir(), ['linear'])

    expect(process.exitCode).toBe(1)
    // Trusting the skill must never silently trust the MCP server too
    expect(JSON.parse(await targetFile('ai-lock.json'))).toEqual(sharedNameLock)
    expect(getLogs()).toMatchInlineSnapshot(
      `"error: Ambiguous name: linear matches a skill and an MCP server: use skill:linear or mcp:linear"`,
    )
  })
})
