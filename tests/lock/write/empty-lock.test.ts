import { it, expect } from 'vitest'
import { writeLock } from '../../../src/lock.ts'
import { setupLockTest } from '../lock-test-utils.ts'

const { thenLockFile, getCwd } = setupLockTest()

it('writes an empty lock file to disk', async () => {
  await writeLock({ version: 1, skills: {}, mcpServers: {}, hooks: {} }, getCwd())

  expect(await thenLockFile()).toMatchInlineSnapshot(`
    "{
      "version": 1,
      "skills": {},
      "mcpServers": {},
      "hooks": {}
    }"
  `)
})
