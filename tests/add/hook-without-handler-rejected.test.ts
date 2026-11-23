import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'add hook / no handler for the target agents',
  ({ givenSource, whenAdd, targetFiles }) => {
    it('should fail instead of locking a hook that wrote nothing', async () => {
      await givenSource({
        hookDirs: {
          guard: {
            cursor: { preToolUse: [{ matcher: 'Shell', command: 'guard' }] },
          },
        },
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
