import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / skill bundled with hooks',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should install skill files and hooks config together', async () => {
      await givenSource({
        skills: [{ name: 'safe-bash' }],
        hooks: hookBlockRm,
      })

      await whenInstall({ skills: ['safe-bash'], hooks: ['block-rm'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/safe-bash/SKILL.md',
        '.claude/settings.json',
        '.claude/skills/safe-bash',
        'ai-lock.json',
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
