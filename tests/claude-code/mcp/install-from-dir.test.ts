import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai(
  'claude-code / install MCP from mcps/ directory',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('should install an MCP server from mcps/<name>/mcp.json', async () => {
      await givenSource({
        mcpDirs: {
          linear: mcpLinear,
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
        [
          "mcps/linear/mcp.json",
        ]
      `)

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
