import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai(
  'open-code / install MCP with skill',
  ({ givenSource, whenInstall, targetHasFiles }) => {
    it('should install both skill and MCP server', async () => {
      await givenSource({
        skills: [{ name: 'my-skill' }],
        mcps: {
          linear: mcpLinear,
        },
      })

      await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

      await targetHasFiles(
        '.agents/skills/my-skill/SKILL.md',
        '.opencode/skills/my-skill',
        'ai-lock.json',
        'opencode.json',
      )
    })
  },
)
