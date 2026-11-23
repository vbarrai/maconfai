import { it, expect } from 'vitest'
import { describeConfai, mcpGithub, mcpLinearUrl } from '../test-utils.ts'

describeConfai(
  'add mcp / adds only the named MCP server',
  ({ givenSource, whenAdd, targetFile, targetFiles }) => {
    it('should write the named server to every agent config and nothing else', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcpDirs: { github: mcpGithub, linear: mcpLinearUrl },
      })

      await whenAdd('mcp', ['linear'], ['--agents=claude-code,cursor,codex'])

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".codex/config.toml",
          ".cursor/mcp.json",
          ".mcp.json",
          "ai-lock.json",
        ]
      `)
      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "linear": {
              "url": "https://mcp.linear.app/sse"
            }
          }
        }
        "
      `)
      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "[mcp_servers.linear]
        url = "https://mcp.linear.app/sse"
        "
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect([Object.keys(lock.skills), Object.keys(lock.mcpServers)]).toMatchInlineSnapshot(`
        [
          [],
          [
            "linear",
          ],
        ]
      `)
    })
  },
)
