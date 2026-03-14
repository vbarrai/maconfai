import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const {} = setupLockTest()

it('removeFromLock / does not crash on non-existent skill', async () => {
  vi.resetModules()
  const { removeFromLock, readLock } = await import('../../../src/lock.ts')

  await removeFromLock('does-not-exist')

  expect(await readLock()).toMatchInlineSnapshot(`
    {
      "skills": {},
      "version": 1,
    }
  `)
})
