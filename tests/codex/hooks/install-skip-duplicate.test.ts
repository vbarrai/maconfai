import { it, expect } from 'vitest'
import { describeConfai, hookBlockRmCodex } from '../../test-utils.ts'

describeConfai(
  'codex / skip duplicate hook handlers',
  ({ givenSource, whenInstall, targetFile }) => {
    it('does not duplicate identical handlers on reinstall', async () => {
      await givenSource({ hooks: hookBlockRmCodex })

      await whenInstall({ hooks: ['block-rm'], agents: ['codex'] })
      await whenInstall({ hooks: ['block-rm'], agents: ['codex'] })

      expect(await targetFile('.codex/hooks.json')).toMatchInlineSnapshot(`
      "{
        "hooks": {
          "PreToolUse": [
            {
              "matcher": "Bash",
              "hooks": [
                {
                  "type": "command",
                  "command": ".codex/hooks/block-rm.sh"
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
