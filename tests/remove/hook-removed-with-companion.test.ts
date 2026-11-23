import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remove hook / removes only the named hook',
  ({ givenSource, whenAdd, whenRemove, targetFile, targetFiles }) => {
    it('should remove its handlers from every agent config and its companion files', async () => {
      await givenSource({
        hookDirs: {
          guard: {
            'claude-code': {
              PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'guard' }] }],
            },
            cursor: { preToolUse: [{ matcher: 'Shell', command: 'guard' }] },
            codex: {
              PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'guard' }] }],
            },
          },
          other: {
            'claude-code': {
              PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'other' }] }],
            },
          },
        },
        hookDirFiles: { guard: { 'guard.sh': '#!/bin/sh\n' } },
      })
      await whenAdd('hook', ['guard', 'other'], ['--agents=claude-code,cursor,codex'])

      await whenRemove('hook', ['guard'])

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".claude/settings.json",
          ".codex/hooks.json",
          ".cursor/hooks.json",
          "ai-lock.json",
        ]
      `)
      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PostToolUse": [
              {
                "matcher": "Write",
                "hooks": [
                  {
                    "type": "command",
                    "command": "other"
                  }
                ]
              }
            ]
          }
        }
        "
      `)
      expect(await targetFile('.cursor/hooks.json')).toMatchInlineSnapshot(`
        "{
          "version": 1
        }
        "
      `)
      expect(await targetFile('.codex/hooks.json')).toMatchInlineSnapshot(`
        "{}
        "
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.hooks)).toMatchInlineSnapshot(`
        [
          "other",
        ]
      `)
    })
  },
)
