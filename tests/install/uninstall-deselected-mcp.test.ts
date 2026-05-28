import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / deselecting a MCP server removes it from config',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should remove the deselected MCP on re-install', async () => {
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
          linear: { command: 'npx', args: ['-y', 'mcp-linear'] },
        },
      })

      await whenInstall({ mcps: ['github', 'linear'], agents: ['claude-code'] })

      await targetHasFiles('.mcp.json', 'ai-lock.json')
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

      // Reinstall with only github — linear should be removed
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
            }
          }
        }
        "
      `)
    })
  },
)
