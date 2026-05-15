import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai(
  'open-code / install multiple MCPs',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('installs multiple MCP servers to opencode.json format', async () => {
      await givenSource({
        mcps: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
          },
          linear: mcpLinear,
        },
      })

      await whenInstall({ mcps: ['github', 'linear'], agents: ['open-code'] })

      await targetHasFiles('opencode.json', 'ai-lock.json')

      expect(await targetFile('opencode.json')).toMatchInlineSnapshot(`
      "{
        "mcp": {
          "github": {
            "type": "local",
            "command": [
              "npx",
              "-y",
              "@modelcontextprotocol/server-github"
            ],
            "environment": {
              "GITHUB_TOKEN": "{env:GITHUB_TOKEN}"
            }
          },
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
