import { it, expect } from 'vitest'
import { describeConfai, hookBlockRmCodex } from '../../test-utils.ts'

describeConfai(
  'codex / hooks alongside a skill',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('installs both skill files and hooks config', async () => {
      await givenSource({
        skills: [{ name: 'dev-tools' }],
        hooks: hookBlockRmCodex,
      })

      await whenInstall({
        hooks: ['block-rm'],
        skills: ['dev-tools'],
        agents: ['codex'],
      })

      await targetHasFiles(
        '.agents/skills/dev-tools/SKILL.md',
        '.codex/hooks.json',
        '.codex/skills/dev-tools',
        'ai-lock.json',
      )

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
