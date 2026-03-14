import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('overwrites the lock file completely on second write', async () => {
  const { writeLock } = await import('../../../src/lock.ts')

  await writeLock({ version: 1, skills: { old: { source: 'a' } } } as any)
  await writeLock({ version: 1, skills: { new: { source: 'b' } } } as any)

  expect(await thenLockFile()).toMatchInlineSnapshot(`
    "{
      "version": 1,
      "skills": {
        "new": {
          "source": "b"
        }
      }
    }"
  `)
})
