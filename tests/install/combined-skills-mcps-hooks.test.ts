import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / skills + MCPs + hooks combined',
  ({ givenSource, whenInstall, targetFiles }) => {
    it('should install all three resource types together', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
        mcps: {
          linear: { command: 'npx', args: ['-y', '@mcp/linear'] },
        },
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

      await whenInstall({
        skills: ['lint'],
        mcps: ['linear'],
        hooks: ['block-rm'],
        agents: ['claude-code'],
      })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/lint/SKILL.md",
          ".claude/settings.json",
          ".claude/skills/lint",
          ".mcp.json",
          "ai-lock.json",
        ]
      `)
    })
  },
)
