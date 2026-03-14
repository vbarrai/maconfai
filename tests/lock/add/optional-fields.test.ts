import { it, expect, vi } from 'vitest'

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => (globalThis as any).__TEST_HOME__ }
})

import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile } = setupLockTest()

it('stores optional fields like ref and mcpServers', async () => {
  const { addToLock } = await import('../../../src/lock.ts')

  await addToLock('advanced-skill', {
    source: 'owner/repo',
    sourceUrl: 'https://github.com/owner/repo',
    skillPath: 'skills/advanced-skill/SKILL.md',
    skillFolderHash: 'def456',
    ref: 'v2.0.0',
    mcpServers: ['server-a', 'server-b'],
  })

  const lock = JSON.parse(await thenLockFile())
  const entry = lock.skills['advanced-skill']

  expect({
    ref: entry.ref,
    skillPath: entry.skillPath,
    mcpServers: entry.mcpServers,
  }).toMatchInlineSnapshot(`
    {
      "mcpServers": [
        "server-a",
        "server-b",
      ],
      "ref": "v2.0.0",
      "skillPath": "skills/advanced-skill/SKILL.md",
    }
  `)
})
