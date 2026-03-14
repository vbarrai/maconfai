import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const {} = setupLockTest()

it('removeFromLock / removes an existing skill', async () => {
  vi.resetModules()
  const { addToLock, removeFromLock, readLock } = await import('../../../src/lock.ts')

  await addToLock('to-remove', {
    source: 'test/repo',
    sourceUrl: 'https://github.com/test/repo',
    skillFolderHash: 'abc123',
  })

  await removeFromLock('to-remove')

  expect(await readLock()).toMatchInlineSnapshot(`
    {
      "skills": {},
      "version": 1,
    }
  `)
})
