import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addToLock } from '../../../src/lock.ts'
import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile, getCwd } = setupLockTest()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

it('persists the lock entry to disk as formatted JSON', async () => {
  await addToLock(
    'disk-skill',
    {
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo',
      skillPath: 'skills/disk-skill/SKILL.md',
      skillFolderHash: 'xyz789',
    },
    getCwd(),
  )

  expect(JSON.parse(await thenLockFile())).toMatchInlineSnapshot(`
    {
      "hooks": {},
      "mcpServers": {},
      "skills": {
        "disk-skill": {
          "installedAt": "2025-01-01T00:00:00.000Z",
          "skillFolderHash": "xyz789",
          "skillPath": "skills/disk-skill/SKILL.md",
          "source": "owner/repo",
          "sourceUrl": "https://github.com/owner/repo",
          "updatedAt": "2025-01-01T00:00:00.000Z",
        },
      },
      "version": 1,
    }
  `)
})
