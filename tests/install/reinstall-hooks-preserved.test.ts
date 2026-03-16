import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / reinstall preserves hooks from previous install',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should keep hooks on second install', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
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

      await whenInstall({ skills: ['lint'], hooks: ['block-rm'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/lint/SKILL.md",
          ".claude/settings.json",
          ".claude/skills/lint",
          "ai-lock.json",
        ]
      `)

      // Second install — same source, hooks should still be there
      await whenInstall({ skills: ['lint'], hooks: ['block-rm'], agents: ['claude-code'] })

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
