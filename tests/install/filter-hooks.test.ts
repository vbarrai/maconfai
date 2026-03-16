import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --hooks filter',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should only install the selected hook group', async () => {
      await givenSource({
        hooks: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                { matcher: 'Bash', hooks: [{ type: 'command', command: 'block-rm.sh' }] },
              ],
            },
          },
          'lint-on-edit': {
            'claude-code': {
              PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'lint.sh' }] }],
            },
          },
        },
      })

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".claude/settings.json",
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
    })
  },
)
