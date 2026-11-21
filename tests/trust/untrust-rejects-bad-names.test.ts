import { it, expect, vi, afterEach } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenUntrust, sharedNameLock } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

afterEach(() => {
  process.exitCode = undefined
})

describeConfai('untrust / unknown or ambiguous name', ({ getTargetDir, targetFile }) => {
  it('fails on an unknown or ambiguous name and leaves the lock untouched', async () => {
    const lock = { ...sharedNameLock, hooks: { guard: { source: 'owner/hub', trusted: true } } }
    await givenLock(getTargetDir(), lock)

    // guard is valid each time, but a typo or an ambiguous name blocks the whole command
    await whenUntrust(getTargetDir(), ['guard', 'gaurd'])
    await whenUntrust(getTargetDir(), ['guard', 'linear'])

    expect(process.exitCode).toBe(1)
    expect(JSON.parse(await targetFile('ai-lock.json'))).toEqual(lock)
    expect(getLogs()).toMatchInlineSnapshot(`
      "error: Not found in ai-lock.json: gaurd
      error: Ambiguous name: linear matches a skill and an MCP server: use skill:linear or mcp:linear"
    `)
  })
})
