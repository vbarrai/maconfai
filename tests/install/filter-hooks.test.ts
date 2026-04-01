import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / --hooks filter',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should only install the selected hook group', async () => {
      await givenSource({
        hooks: {
          ...hookBlockRm,
          'lint-on-edit': {
            'claude-code': {
              PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'lint.sh' }] }],
            },
          },
        },
      })

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      await targetHasFiles('.claude/settings.json', 'ai-lock.json')

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
