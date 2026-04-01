import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai(
  'cursor / install multiple MCPs',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('installs multiple MCP servers to .cursor/mcp.json with env-prefix syntax', async () => {
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

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await whenInstall({ mcps: ['github', 'linear'], agents: ['cursor'] })

      await targetHasFiles('.cursor/mcp.json', 'ai-lock.json')

      expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-github"
            ],
            "env": {
              "GITHUB_TOKEN": "\${env:GITHUB_TOKEN}"
            }
          },
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
