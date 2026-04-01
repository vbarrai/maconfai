import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../test-utils.ts'

describeConfai(
  'install / standalone MCP without skills',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should install only MCP config, no skill files', async () => {
      await givenSource({
        mcps: {
          linear: mcpLinear,
        },
      })

      await whenInstall({ mcps: ['linear'], agents: ['claude-code'] })

      await targetHasFiles('.mcp.json', 'ai-lock.json')

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
