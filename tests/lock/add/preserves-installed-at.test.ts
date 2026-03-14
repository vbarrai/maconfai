import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('preserves installedAt when updating an existing skill', async () => {
  const { addToLock } = await import('../../../src/lock.ts')

  await addToLock('my-skill', {
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    skillPath: 'skills/my-skill/SKILL.md',
    skillFolderHash: 'hash-v1',
  })

  const firstLock = JSON.parse(await thenLockFile())
  const originalInstalledAt = firstLock.skills['my-skill'].installedAt

  await addToLock('my-skill', {
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    skillPath: 'skills/my-skill/SKILL.md',
    skillFolderHash: 'hash-v2',
  })

  const lock = JSON.parse(await thenLockFile())
  expect(lock.skills['my-skill'].installedAt).toBe(originalInstalledAt)
  lock.skills['my-skill'].installedAt = '<timestamp>'
  lock.skills['my-skill'].updatedAt = '<timestamp>'

  expect(lock.skills['my-skill']).toMatchInlineSnapshot(`
    {
      "installedAt": "<timestamp>",
      "skillFolderHash": "hash-v2",
      "skillPath": "skills/my-skill/SKILL.md",
      "source": "owner/repo",
      "sourceUrl": "https://github.com/owner/repo",
      "updatedAt": "<timestamp>",
    }
  `)
})
