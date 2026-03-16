import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / MCP not created for codex',
  ({ givenSource, whenInstall, targetFiles }) => {
    it('should install skill but skip MCP config for codex', async () => {
      await givenSource({
        skills: [
          {
            name: 'with-mcp',
            mcpServers: { github: { command: 'npx', args: ['-y', '@mcp/github'] } },
          },
        ],
      })

      await whenInstall({ skills: ['with-mcp'], agents: ['codex'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/with-mcp/SKILL.md",
        ".agents/skills/with-mcp/mcp.json",
        ".codex/skills/with-mcp",
        "ai-lock.json",
      ]
    `)
    })
  },
)
