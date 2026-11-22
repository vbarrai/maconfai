import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --mcps adds to the installed MCP servers',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should keep the MCP servers already installed from the same source', async () => {
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
          linear: { command: 'npx', args: ['-y', 'mcp-linear'] },
        },
      })

      await whenInstall({ mcps: ['github', 'linear'], agents: ['claude-code'] })

      // Naming only github is not a request to remove linear
      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "github": {
              "command": "npx",
              "args": [
                "-y",
                "@mcp/github"
              ]
            },
            "linear": {
              "command": "npx",
              "args": [
                "-y",
                "mcp-linear"
              ]
            }
          }
        }
        "
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.mcpServers).sort()).toMatchInlineSnapshot(`
        [
          "github",
          "linear",
        ]
      `)
    })
  },
)
