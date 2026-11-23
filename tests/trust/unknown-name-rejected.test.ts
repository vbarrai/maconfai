import { it, expect, vi, afterEach } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, mixedTrustLock } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)

afterEach(() => {
  process.exitCode = undefined
})

describeConfai('trust / unknown name', ({ getTargetDir, targetFile }) => {
  it('fails on a name missing from the lock and writes nothing, even for valid names', async () => {
    await givenLock(getTargetDir(), mixedTrustLock)

    await whenTrust(getTargetDir(), ['alpha', 'alhpa'])

    expect(process.exitCode).toBe(1)
    // A typo must not half-apply: alpha is left as it was
    expect(JSON.parse(await targetFile('ai-lock.json'))).toEqual(mixedTrustLock)
    expect(getLogs()).toMatchInlineSnapshot(`"error: Not found in ai-lock.json: alhpa"`)
  })
})
