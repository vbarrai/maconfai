import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('persists the lock entry to disk as formatted JSON', async () => {
  const { addToLock } = await import('../../../src/lock.ts')

  await addToLock('disk-skill', {
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    skillPath: 'skills/disk-skill/SKILL.md',
    skillFolderHash: 'xyz789',
  })

  const lock = JSON.parse(await thenLockFile())
  lock.skills['disk-skill'].installedAt = '<timestamp>'
  lock.skills['disk-skill'].updatedAt = '<timestamp>'

  expect(lock).toMatchInlineSnapshot(`
    {
      "skills": {
        "disk-skill": {
          "installedAt": "<timestamp>",
          "skillFolderHash": "xyz789",
          "skillPath": "skills/disk-skill/SKILL.md",
          "source": "owner/repo",
          "sourceUrl": "https://github.com/owner/repo",
          "updatedAt": "<timestamp>",
        },
      },
      "version": 1,
    }
  `)
})
