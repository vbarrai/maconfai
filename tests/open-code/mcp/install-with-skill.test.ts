import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'open-code / install MCP with skill',
  ({ givenSource, whenInstall, targetFiles }) => {
    it('should install both skill and MCP server', async () => {
      await givenSource({
        skills: [{ name: 'my-skill' }],
        mcps: {
          linear: {
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
          },
        },
      })

      await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/my-skill/SKILL.md",
          ".opencode/skills/my-skill",
          "ai-lock.json",
          "opencode.json",
        ]
      `)
    })
  },
)
