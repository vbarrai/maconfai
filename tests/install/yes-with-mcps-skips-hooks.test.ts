import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / -y with --mcps installs no unrequested hook or skill',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should install only the requested MCP server', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcpDirs: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
          postgres: { command: 'npx', args: ['-y', '@mcp/pg'] },
        },
        hooks: hookBlockRm,
      })

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
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
          "hooks": [],
          "mcpServers": [
            "github",
          ],
          "skills": [],
        }
      `)
    })
  },
)
