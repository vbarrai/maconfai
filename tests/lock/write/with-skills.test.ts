import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('writes a lock file with one skill entry', async () => {
  const { writeLock } = await import('../../../src/lock.ts')

  await writeLock({
    version: 1,
    skills: {
      'test-skill': {
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo',
        skillFolderHash: 'abc123',
        installedAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    },
  } as any)

  expect(await thenLockFile()).toMatchInlineSnapshot(`
    "{
      "version": 1,
      "skills": {
        "test-skill": {
          "source": "owner/repo",
          "sourceUrl": "https://github.com/owner/repo",
          "skillFolderHash": "abc123",
          "installedAt": "2025-01-01T00:00:00.000Z",
          "updatedAt": "2025-01-01T00:00:00.000Z"
        }
      }
    }"
  `)
})
