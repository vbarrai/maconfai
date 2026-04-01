import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / install MCP from mcps/ directory',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('should install an MCP server from mcps/<name>/mcp.json', async () => {
      await givenSource({
        mcpDirs: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
          },
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
        [
          "mcps/github/mcp.json",
        ]
      `)

      await whenInstall({ mcps: ['github'], agents: ['cursor'] })

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
            }
          }
        }
        "
      `)
    })
  },
)
