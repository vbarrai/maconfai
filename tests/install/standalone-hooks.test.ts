import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / standalone hooks without skills',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should install only hooks config, no skill files', async () => {
      await givenSource({
        hooks: hookBlockRm,
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
