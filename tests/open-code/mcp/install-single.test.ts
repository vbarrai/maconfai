import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'open-code / install single MCP',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetFiles }) => {
    it('should install a simple mcp server in opencode.json format', async () => {
      await givenSource({
        mcps: {
          linear: {
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
          },
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          "ai-lock.json",
          "opencode.json",
        ]
      `)

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
