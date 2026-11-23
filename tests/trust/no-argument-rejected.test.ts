import { it, expect, vi, afterEach } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, mixedTrustLock } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

afterEach(() => {
  process.exitCode = undefined
})

describeConfai('trust / no argument', ({ getTargetDir, targetFile }) => {
  it('asks for names or --all instead of trusting everything by default', async () => {
    await givenLock(getTargetDir(), mixedTrustLock)

    await whenTrust(getTargetDir(), [])

    expect(process.exitCode).toBe(1)
    expect(JSON.parse(await targetFile('ai-lock.json'))).toEqual(mixedTrustLock)
    expect(getLogs()).toMatchInlineSnapshot(
      `"error: Name the configs to trust (maconfai trust <name...>) or pass --all"`,
    )
  })
})
