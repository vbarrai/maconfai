import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'claude-code / install single hook',
  ({ givenSource, sourceFiles, when, targetFile, targetFiles }) => {
    it('should install a simple hook into settings.json', async () => {
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

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "hooks.json",
      ]
    `)

      await when({ hooks: ['block-rm'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".claude/settings.json",
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
