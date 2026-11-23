import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm, hookLintOnEdit } from '../test-utils.ts'

describeConfai(
  'install / --hooks adds to the installed hooks',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should keep the hooks already installed from the same source', async () => {
      await givenSource({
        hooks: { ...hookBlockRm, ...hookLintOnEdit },
      })

      await whenInstall({ hooks: ['block-rm', 'lint-on-edit'], agents: ['claude-code'] })

      // Naming only lint-on-edit is not a request to remove block-rm
      await whenInstall({ hooks: ['lint-on-edit'], agents: ['claude-code'] })

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
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.hooks).sort()).toMatchInlineSnapshot(`
        [
          "block-rm",
          "lint-on-edit",
        ]
      `)
    })
  },
)
