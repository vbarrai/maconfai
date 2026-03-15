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

it('adds a new skill entry to the lock file', async () => {
  await addToLock(
    'my-skill',
    {
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo',
      skillPath: 'skills/my-skill/SKILL.md',
      skillFolderHash: 'abc123',
    },
    getCwd(),
  )

  expect(JSON.parse(await thenLockFile())).toMatchInlineSnapshot(`
    {
      "hooks": {},
      "mcpServers": {},
      "skills": {
        "my-skill": {
          "installedAt": "2025-01-01T00:00:00.000Z",
          "skillFolderHash": "abc123",
          "skillPath": "skills/my-skill/SKILL.md",
          "source": "owner/repo",
          "sourceUrl": "https://github.com/owner/repo",
          "updatedAt": "2025-01-01T00:00:00.000Z",
        },
      },
      "version": 1,
    }
  `)
})
