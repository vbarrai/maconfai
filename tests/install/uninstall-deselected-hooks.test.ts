import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm, hookLintOnEdit } from '../test-utils.ts'

describeConfai(
  'install / deselecting a hook group removes its handlers from config',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should remove the deselected hook handlers on re-install', async () => {
      await givenSource({
        hooks: { ...hookBlockRm, ...hookLintOnEdit },
      })

      await whenInstall({ hooks: ['block-rm', 'lint-on-edit'], agents: ['claude-code'] })

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
            ],
            "PostToolUse": [
              {
                "matcher": "Edit",
                "hooks": [
                  {
                    "type": "command",
                    "command": "lint.sh"
                  }
                ]
              }
            ]
          }
        }
        "
      `)

      // Reinstall with only lint-on-edit — block-rm handlers should be removed
      await whenInstall({ hooks: ['lint-on-edit'], agents: ['claude-code'] })

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PostToolUse": [
              {
                "matcher": "Edit",
                "hooks": [
                  {
                    "type": "command",
                    "command": "lint.sh"
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
