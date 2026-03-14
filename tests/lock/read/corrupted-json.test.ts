import { it, expect, vi } from 'vitest'
import { setupLockTest } from '../lock-test-utils.ts'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

const { givenLockFile } = setupLockTest()

it('readLock / returns empty lock for corrupted JSON', async () => {
  await givenLockFile('{not valid json')

  const { readLock } = await import('../../../src/lock.ts')

  expect(await readLock()).toMatchInlineSnapshot(`
    {
      "skills": {},
      "version": 1,
    }
  `)
})
