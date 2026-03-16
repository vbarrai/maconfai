import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / hooks installed to multiple agents',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should install agent-specific hooks to each agent', async () => {
      await givenSource({
        hooks: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                { matcher: 'Bash', hooks: [{ type: 'command', command: 'block-rm.sh' }] },
              ],
            },
            cursor: {
              onSave: [
                { matcher: '**/*.sh', hooks: [{ type: 'command', command: 'validate.sh' }] },
              ],
            },
          },
        },
      })

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code', 'cursor'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".claude/settings.json",
          ".cursor/hooks.json",
          "ai-lock.json",
        ]
      `)

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PreToolUse": [
              {
                "matcher": "Bash",
                "hooks": [
                  {
                    "type": "command",
                    "command": "block-rm.sh"
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
          "version": 1,
          "hooks": {
            "onSave": [
              {
                "matcher": "**/*.sh",
                "hooks": [
                  {
                    "type": "command",
                    "command": "validate.sh"
                  }
                ]
              }
            ]
          }
        }
        "
      `)
    })
  },
)
