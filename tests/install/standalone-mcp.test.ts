import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / standalone MCP without skills',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should install only MCP config, no skill files', async () => {
      await givenSource({
        mcps: {
          linear: {
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
          },
        },
      })

      await whenInstall({ mcps: ['linear'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".mcp.json",
        "ai-lock.json",
      ]
    `)

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "linear": {
            "command": "npx",
            "args": [
              "-y",
              "mcp-remote",
              "https://mcp.linear.app/mcp"
            ]
          }
        }
      }
      "
    `)
    })
  },
)
