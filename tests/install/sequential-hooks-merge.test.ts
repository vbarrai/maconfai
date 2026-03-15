import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / sequential installs merge hooks from different providers',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should merge hooks from two sequential installs', async () => {
      // First provider — block-rm hook
      await givenSource({
        hooks: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                { matcher: 'Bash', hooks: [{ type: 'command', command: 'block-rm.sh' }] },
              ],
            },
          },
        },
      })

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      // Second provider — lint-on-edit hook
      await givenSource({
        hooks: {
          'lint-on-edit': {
            'claude-code': {
              PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'lint.sh' }] }],
            },
          },
        },
      })

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
    })
  },
)
