import { it, expect } from 'vitest'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'claude-code / preserve manually configured MCP',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('does not overwrite a manually configured MCP with the same name', async () => {
      const targetDir = getTargetDir()
      await writeFile(
        join(targetDir, '.mcp.json'),
        JSON.stringify(
          {
            mcpServers: {
              github: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: { GITHUB_TOKEN: 'manually-set-token' },
              },
            },
          },
          null,
          2,
        ) + '\n',
      )

      await givenSource({
        mcps: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: '${MACONFAI_TOKEN}' },
          },
        },
      })

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-github"
            ],
            "env": {
              "GITHUB_TOKEN": "manually-set-token"
            }
          }
        }
      }
      "
    `)
    })

    it('installs a new MCP alongside an existing manually configured one', async () => {
      const targetDir = getTargetDir()
      await writeFile(
        join(targetDir, '.mcp.json'),
        JSON.stringify(
          {
            mcpServers: {
              'my-custom-mcp': {
                command: 'node',
                args: ['my-custom-server.js'],
              },
            },
          },
          null,
          2,
        ) + '\n',
      )

      await givenSource({
        mcps: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
          },
        },
      })

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "my-custom-mcp": {
            "command": "node",
            "args": [
              "my-custom-server.js"
            ]
          },
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-github"
            ]
          }
        }
      }
      "
    `)
    })
  },
)
