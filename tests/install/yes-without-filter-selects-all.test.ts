import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / -y without any filter installs everything',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should install every skill, MCP server and hook of the source', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }, { name: 'beta' }],
        mcpDirs: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
        },
        hooks: hookBlockRm,
      })

      await whenInstall({ agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".agents/skills/beta/SKILL.md",
          ".claude/settings.json",
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
            "beta",
          ],
        }
      `)
    })
  },
)
