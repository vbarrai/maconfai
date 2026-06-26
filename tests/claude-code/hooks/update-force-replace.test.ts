import { it, expect } from 'vitest'
import { describeConfai, hookBlockRmClaudeCode } from '../../test-utils.ts'
import { installHooks } from '../../../src/hooks.ts'

describeConfai(
  'claude-code / force replaces a hook handler by matcher',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('replaces an existing same-matcher handler instead of appending (update path)', async () => {
      await givenSource({ hooks: hookBlockRmClaudeCode })
      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      // The update flow calls installHooks with force: true. A handler with the
      // same matcher must overwrite the existing one, not create a duplicate.
      await installHooks(
        {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: '.claude/hooks/block-rm-v2.sh' }],
            },
          ],
        },
        'claude-code',
        { cwd: getTargetDir(), force: true },
      )

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PreToolUse": [
              {
                "matcher": "Bash",
                "hooks": [
                  {
                    "type": "command",
                    "command": ".claude/hooks/block-rm-v2.sh"
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
