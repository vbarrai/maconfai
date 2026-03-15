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

it('preserves installedAt when updating an existing skill', async () => {
  await addToLock(
    'my-skill',
    {
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo',
      skillPath: 'skills/my-skill/SKILL.md',
      skillFolderHash: 'hash-v1',
    },
    getCwd(),
  )

  vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'))

  await addToLock(
    'my-skill',
    {
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo',
      skillPath: 'skills/my-skill/SKILL.md',
      skillFolderHash: 'hash-v2',
    },
    getCwd(),
  )

  const lock = JSON.parse(await thenLockFile())
  expect(lock.skills['my-skill']).toMatchInlineSnapshot(`
    {
      "installedAt": "2025-01-01T00:00:00.000Z",
      "skillFolderHash": "hash-v2",
      "skillPath": "skills/my-skill/SKILL.md",
      "source": "owner/repo",
      "sourceUrl": "https://github.com/owner/repo",
      "updatedAt": "2025-06-01T00:00:00.000Z",
    }
  `)
})
