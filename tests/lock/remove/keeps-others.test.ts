import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addToLock, removeFromLock, readLock } from '../../../src/lock.ts'
import { setupLockTest } from '../lock-test-utils.ts'

const { getCwd } = setupLockTest()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

it('removeFromLock / keeps other skills intact', async () => {
  await addToLock(
    'keep-me',
    {
      source: 'test/repo',
      sourceUrl: 'https://github.com/test/repo',
      skillFolderHash: 'hash-keep',
    },
    getCwd(),
  )

  await addToLock(
    'remove-me',
    {
      source: 'test/repo',
      sourceUrl: 'https://github.com/test/repo',
      skillFolderHash: 'hash-remove',
    },
    getCwd(),
  )

  await removeFromLock('remove-me', getCwd())

  expect(await readLock(getCwd())).toMatchInlineSnapshot(`
    {
      "hooks": {},
      "mcpServers": {},
      "skills": {
        "keep-me": {
          "installedAt": "2025-01-01T00:00:00.000Z",
          "skillFolderHash": "hash-keep",
          "source": "test/repo",
          "sourceUrl": "https://github.com/test/repo",
          "updatedAt": "2025-01-01T00:00:00.000Z",
        },
      },
      "version": 1,
    }
  `)
})
