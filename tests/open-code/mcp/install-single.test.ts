import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai(
  'open-code / install single MCP',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('should install a simple mcp server in opencode.json format', async () => {
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

      await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

      await targetHasFiles('ai-lock.json', 'opencode.json')

      expect(await targetFile('opencode.json')).toMatchInlineSnapshot(`
      "{
        "mcp": {
          "linear": {
            "type": "local",
            "command": [
              "npx",
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
