import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const {} = setupLockTest()

it('removeFromLock / keeps other skills intact', async () => {
  vi.resetModules()
  const { addToLock, removeFromLock, readLock } = await import('../../../src/lock.ts')

  await addToLock('keep-me', {
    source: 'test/repo',
    sourceUrl: 'https://github.com/test/repo',
    skillFolderHash: 'hash-keep',
  })

  await addToLock('remove-me', {
    source: 'test/repo',
    sourceUrl: 'https://github.com/test/repo',
    skillFolderHash: 'hash-remove',
  })

  await removeFromLock('remove-me')

  const lock = await readLock()
  const sanitized = JSON.parse(
    JSON.stringify(lock).replace(/"\d{4}-\d{2}-\d{2}T[^"]+"/g, '"<timestamp>"'),
  )

  expect(sanitized).toMatchInlineSnapshot(`
    {
      "skills": {
        "keep-me": {
          "installedAt": "<timestamp>",
          "skillFolderHash": "hash-keep",
          "source": "test/repo",
          "sourceUrl": "https://github.com/test/repo",
          "updatedAt": "<timestamp>",
        },
      },
      "version": 1,
    }
  `)
})
