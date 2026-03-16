import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / hooks alongside a skill',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('installs both skill files and hooks config', async () => {
      await givenSource({
        skills: [{ name: 'dev-tools' }],
        hooks: {
          'format-on-edit': {
            cursor: {
              afterFileEdit: [{ command: '.cursor/hooks/format.sh', matcher: 'Write' }],
            },
          },
        },
      })

      await whenInstall({
        hooks: ['format-on-edit'],
        skills: ['dev-tools'],
        agents: ['cursor'],
      })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/dev-tools/SKILL.md",
          ".cursor/hooks.json",
          ".cursor/skills/dev-tools",
          "ai-lock.json",
        ]
      `)

      expect(await targetFile('.cursor/hooks.json')).toMatchInlineSnapshot(`
      "{
        "version": 1,
        "hooks": {
          "afterFileEdit": [
            {
              "command": ".cursor/hooks/format.sh",
              "matcher": "Write"
            }
          ]
        }
      }
      "
    `)
    })
  },
)
