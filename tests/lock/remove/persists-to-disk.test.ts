import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('removeFromLock / persists removal to disk', async () => {
  vi.resetModules()
  const { addToLock, removeFromLock } = await import('../../../src/lock.ts')

  await addToLock('ephemeral', {
    source: 'test/repo',
    sourceUrl: 'https://github.com/test/repo',
    skillFolderHash: 'hash-ephemeral',
  })

  await removeFromLock('ephemeral')

  expect(await thenLockFile()).toMatchInlineSnapshot(`
    "{
      "version": 1,
      "skills": {}
    }"
  `)
})
