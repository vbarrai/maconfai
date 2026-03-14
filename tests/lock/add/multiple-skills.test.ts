import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('stores multiple skills independently', async () => {
  const { addToLock } = await import('../../../src/lock.ts')

  await addToLock('skill-a', {
    source: 'alice/repo',
    sourceUrl: 'https://github.com/alice/repo',
    skillPath: 'skills/skill-a/SKILL.md',
    skillFolderHash: 'aaa111',
  })

  await addToLock('skill-b', {
    source: 'bob/repo',
    sourceUrl: 'https://github.com/bob/repo',
    skillPath: 'skills/skill-b/SKILL.md',
    skillFolderHash: 'bbb222',
  })

  const lock = JSON.parse(await thenLockFile())

  expect(Object.keys(lock.skills)).toMatchInlineSnapshot(`
    [
      "skill-a",
      "skill-b",
    ]
  `)
})
