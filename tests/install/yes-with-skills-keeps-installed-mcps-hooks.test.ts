import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / -y with --skills keeps the MCP servers and hooks already installed',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should add the skill without removing any MCP server or hook', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcpDirs: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
        },
        hooks: hookBlockRm,
      })
      await whenInstall({ mcps: ['github'], hooks: ['block-rm'], agents: ['claude-code'] })

      await whenInstall({ skills: ['alpha'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/settings.json",
          ".claude/skills/alpha",
          ".mcp.json",
          "ai-lock.json",
        ]
      `)

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect({
        skills: Object.keys(lock.skills),
        mcpServers: Object.keys(lock.mcpServers),
        hooks: Object.keys(lock.hooks),
      }).toMatchInlineSnapshot(`
        {
          "hooks": [
            "block-rm",
          ],
          "mcpServers": [
            "github",
          ],
          "skills": [
            "alpha",
          ],
        }
      `)
      expect(JSON.parse(await targetFile('.mcp.json')).mcpServers.github.command).toBe('npx')
    })
  },
)
