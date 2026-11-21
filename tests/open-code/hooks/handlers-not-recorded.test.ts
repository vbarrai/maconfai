import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

// Open Code has no hooks config: nothing is written for it, so the lock must not claim a handler.
describeConfai(
  'open-code / hook group with an open-code key',
  ({ given, whenInstall, targetFile, targetFiles }) => {
    it('should record handlers only for the agents a hooks file was written for', async () => {
      const handler = { matcher: 'Bash', hooks: [{ type: 'command', command: 'guard.sh' }] }
      await given({
        './hooks.json': JSON.stringify({
          hooks: {
            guard: {
              'claude-code': { PreToolUse: [handler] },
              'open-code': { PreToolUse: [handler] },
            },
          },
        }),
      })

      await whenInstall({ hooks: ['guard'], agents: ['claude-code', 'open-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".claude/settings.json",
          "ai-lock.json",
        ]
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.hooks.guard.handlers)).toMatchInlineSnapshot(`
        [
          "claude-code",
        ]
      `)
    })
  },
)
