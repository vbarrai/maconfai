import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addHookToLock } from '../../../src/lock.ts'
import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile, getCwd } = setupLockTest()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

it('adds a new hook entry to the lock file', async () => {
  await addHookToLock(
    'block-rm',
    {
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo',
    },
    getCwd(),
  )

  expect(JSON.parse(await thenLockFile())).toMatchInlineSnapshot(`
    {
      "hooks": {
        "block-rm": {
          "installedAt": "2025-01-01T00:00:00.000Z",
          "source": "owner/repo",
          "sourceUrl": "https://github.com/owner/repo",
          "updatedAt": "2025-01-01T00:00:00.000Z",
        },
      },
      "mcpServers": {},
      "skills": {},
      "version": 1,
    }
  `)
})
