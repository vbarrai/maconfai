import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / skill alongside MCP from mcps/ directory',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should install skill files and MCP config together', async () => {
      await givenSource({
        skills: [{ name: 'github-skill' }],
        mcpDirs: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
        },
      })

      await whenInstall({
        skills: ['github-skill'],
        mcps: ['github'],
        agents: ['claude-code'],
      })

      await targetHasFiles(
        '.agents/skills/github-skill/SKILL.md',
        '.claude/skills/github-skill',
        '.mcp.json',
        'ai-lock.json',
      )

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
