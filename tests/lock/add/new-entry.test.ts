import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('adds a new skill entry to the lock file', async () => {
  const { addToLock } = await import('../../../src/lock.ts')

  await addToLock('my-skill', {
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    skillPath: 'skills/my-skill/SKILL.md',
    skillFolderHash: 'abc123',
  })

  const lock = JSON.parse(await thenLockFile())
  lock.skills['my-skill'].installedAt = '<timestamp>'
  lock.skills['my-skill'].updatedAt = '<timestamp>'

  expect(lock).toMatchInlineSnapshot(`
    {
      "skills": {
        "my-skill": {
          "installedAt": "<timestamp>",
          "skillFolderHash": "abc123",
          "skillPath": "skills/my-skill/SKILL.md",
          "source": "owner/repo",
          "sourceUrl": "https://github.com/owner/repo",
          "updatedAt": "<timestamp>",
        },
      },
      "version": 1,
    }
  `)
})
