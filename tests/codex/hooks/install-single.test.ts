import { it, expect } from 'vitest'
import { describeConfai, hookBlockRmCodex } from '../../test-utils.ts'

describeConfai(
  'codex / install single hook',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('should install a simple hook into .codex/hooks.json', async () => {
      await givenSource({ hooks: hookBlockRmCodex })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
        [
          "hooks.json",
        ]
      `)

      await whenInstall({ hooks: ['block-rm'], agents: ['codex'] })

      await targetHasFiles('.codex/hooks.json', 'ai-lock.json')

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
