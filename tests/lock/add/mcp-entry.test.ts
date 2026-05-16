import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addMcpToLock } from '../../../src/lock.ts'
import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile, getCwd } = setupLockTest()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

it('adds a new MCP server entry to the lock file', async () => {
  await addMcpToLock(
    'linear',
    {
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo',
    },
    getCwd(),
  )

  expect(JSON.parse(await thenLockFile())).toMatchInlineSnapshot(`
    {
      "hooks": {},
      "mcpServers": {
        "linear": {
          "installedAt": "2025-01-01T00:00:00.000Z",
          "source": "owner/repo",
          "sourceUrl": "https://github.com/owner/repo",
          "updatedAt": "2025-01-01T00:00:00.000Z",
        },
      },
      "skills": {},
      "version": 1,
    }
  `)
})
