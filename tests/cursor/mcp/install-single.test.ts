import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai(
  'cursor / install single MCP',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('should install a simple mcp server', async () => {
      await givenSource({
        mcps: {
          linear: mcpLinear,
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await whenInstall({ mcps: ['linear'], agents: ['cursor'] })

      await targetHasFiles('.cursor/mcp.json', 'ai-lock.json')

      expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
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
