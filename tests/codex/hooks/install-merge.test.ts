import { it, expect } from 'vitest'
import { describeConfai, hookBlockRmCodex } from '../../test-utils.ts'

describeConfai(
  'codex / merge hooks across installs',
  ({ givenSource, whenInstall, targetFile }) => {
    it('second install appends new hooks without removing existing ones', async () => {
      await givenSource({ hooks: hookBlockRmCodex })

      await whenInstall({ hooks: ['block-rm'], agents: ['codex'] })

      await givenSource({
        hooks: {
          'lint-on-edit': {
            codex: {
              PreToolUse: [
                {
                  matcher: 'Edit',
                  hooks: [{ type: 'command', command: '.codex/hooks/lint.sh' }],
                },
              ],
            },
          },
        },
      })

      await whenInstall({ hooks: ['lint-on-edit'], agents: ['codex'] })

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
            },
            {
              "matcher": "Edit",
              "hooks": [
                {
                  "type": "command",
                  "command": ".codex/hooks/lint.sh"
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
