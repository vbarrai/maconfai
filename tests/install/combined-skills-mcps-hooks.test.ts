import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / skills + MCPs + hooks combined',
  ({ givenSource, whenInstall, targetHasFiles }) => {
    it('should install all three resource types together', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
        mcps: {
          linear: { command: 'npx', args: ['-y', '@mcp/linear'] },
        },
        hooks: hookBlockRm,
      })

      await whenInstall({
        skills: ['lint'],
        mcps: ['linear'],
        hooks: ['block-rm'],
        agents: ['claude-code'],
      })

      await targetHasFiles(
        '.agents/skills/lint/SKILL.md',
        '.claude/settings.json',
        '.claude/skills/lint',
        '.mcp.json',
        'ai-lock.json',
      )
    })
  },
)
