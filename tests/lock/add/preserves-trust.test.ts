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

it('preserves trusted when an update re-locks without specifying it', async () => {
  // Install marks the skill trusted
  await addToLock(
    'my-skill',
    {
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo',
      skillPath: 'skills/my-skill/SKILL.md',
      skillFolderHash: 'hash-v1',
      trusted: true,
    },
    getCwd(),
  )

  // Update re-locks with a new hash but no trusted field (as check.ts does)
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
  expect(lock.skills['my-skill'].trusted).toBe(true)
  expect(lock.skills['my-skill'].skillFolderHash).toBe('hash-v2')
})
