import { it, expect } from 'vitest'
import { describeConfai, mcpGithub, mcpLinearUrl } from '../test-utils.ts'

describeConfai(
  'remove mcp / removes only the named MCP server',
  ({ givenSource, whenAdd, whenRemove, targetFile }) => {
    it('should remove the server from the Claude Code, Cursor and Codex configs', async () => {
      await givenSource({ mcpDirs: { github: mcpGithub, linear: mcpLinearUrl } })
      await whenAdd('mcp', ['github', 'linear'], ['--agents=claude-code,cursor,codex'])

      await whenRemove('mcp', ['github'])

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
      expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
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
      expect(Object.keys(lock.mcpServers)).toMatchInlineSnapshot(`
        [
          "linear",
        ]
      `)
    })
  },
)
