import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('writes an empty lock file to disk', async () => {
  const { writeLock } = await import('../../../src/lock.ts')

  await writeLock({ version: 1, skills: {} })

  expect(await thenLockFile()).toMatchInlineSnapshot(`
    "{
      "version": 1,
      "skills": {}
    }"
  `)
})
