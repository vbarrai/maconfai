import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'claude-code / skip duplicate hook handlers',
  ({ givenSource, when, targetFile }) => {
    it('does not duplicate identical handlers on reinstall', async () => {
      await givenSource({
        hooks: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                {
                  matcher: 'Bash',
                  hooks: [{ type: 'command', command: '.claude/hooks/block-rm.sh' }],
                },
              ],
            },
          },
        },
      })

      await when({ hooks: ['block-rm'], agents: ['claude-code'] })
      await when({ hooks: ['block-rm'], agents: ['claude-code'] })

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
      "{
        "hooks": {
          "PreToolUse": [
            {
              "matcher": "Bash",
              "hooks": [
                {
                  "type": "command",
                  "command": ".claude/hooks/block-rm.sh"
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
