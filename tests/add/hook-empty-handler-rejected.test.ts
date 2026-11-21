import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'add hook / only empty handler lists for the target agents',
  ({ givenSource, whenAdd, targetFiles }) => {
    it('should fail instead of locking a hook that wrote nothing', async () => {
      await givenSource({
        hookDirs: { guard: { 'claude-code': { PreToolUse: [] } } },
        hookDirFiles: { guard: { 'guard.sh': '#!/bin/sh\n' } },
      })

      await expect(
        whenAdd('hook', ['guard'], ['--agents=claude-code']),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Hook(s) not installed: guard (no handler for claude-code)]`,
      )

      expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
    })
  },
)
