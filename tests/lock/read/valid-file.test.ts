import { it, expect, vi } from 'vitest'
import { setupLockTest } from '../lock-test-utils.ts'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

const { givenLockFile } = setupLockTest()

it('readLock / parses a valid lock file', async () => {
  await givenLockFile(
    JSON.stringify({
      version: 1,
      skills: {
        'my-skill': {
          source: 'owner/repo',
          sourceUrl: 'https://github.com/owner/repo',
          skillPath: 'skills/my-skill/SKILL.md',
          skillFolderHash: 'abc123',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      },
    }),
  )

  const { readLock } = await import('../../../src/lock.ts')

  expect(await readLock()).toMatchInlineSnapshot(`
    {
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
