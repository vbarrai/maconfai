import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / skill bundled with MCP',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should install skill files and MCP config together', async () => {
      await givenSource({
        skills: [
          {
            name: 'github-skill',
            mcpServers: { github: { command: 'npx', args: ['-y', '@mcp/github'] } },
          },
        ],
      })

      await whenInstall({ skills: ['github-skill'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/github-skill/SKILL.md",
        ".agents/skills/github-skill/mcp.json",
        ".claude/skills/github-skill",
        ".mcp.json",
        "ai-lock.json",
      ]
    `)

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@mcp/github"
            ]
          }
        }
      }
      "
    `)
    })
  },
)
