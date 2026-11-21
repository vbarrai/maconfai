import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / -y with --mcps keeps the skills already installed',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should add the MCP server without removing any skill', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }, { name: 'beta' }],
        mcpDirs: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
        },
      })
      await whenInstall({ skills: ['alpha', 'beta'], agents: ['claude-code'] })

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".agents/skills/beta/SKILL.md",
          ".claude/skills/alpha",
          ".claude/skills/beta",
          ".mcp.json",
          "ai-lock.json",
        ]
      `)

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect({
        skills: Object.keys(lock.skills),
        mcpServers: Object.keys(lock.mcpServers),
      }).toMatchInlineSnapshot(`
        {
          "mcpServers": [
            "github",
          ],
          "skills": [
            "alpha",
            "beta",
          ],
        }
      `)
    })
  },
)
