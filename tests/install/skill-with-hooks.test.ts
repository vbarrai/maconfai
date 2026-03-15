import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / skill bundled with hooks',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should install skill files and hooks config together', async () => {
      await givenSource({
        skills: [{ name: 'safe-bash' }],
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

      await whenInstall({ skills: ['safe-bash'], hooks: ['block-rm'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/safe-bash/SKILL.md",
        ".claude/settings.json",
        ".claude/skills/safe-bash",
        "ai-lock.json",
      ]
    `)

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
