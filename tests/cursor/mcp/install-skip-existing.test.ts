import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('cursor / skip existing MCP server', ({ givenSource, whenInstall, targetFile }) => {
  it('overwrites a maconfai-managed MCP when reinstalled with new config', async () => {
    await givenSource({
      mcps: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_TOKEN: '${ORIGINAL_TOKEN}' },
        },
      },
    })

    await whenInstall({ mcps: ['github'], agents: ['cursor'] })

    await givenSource({
      mcps: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_TOKEN: '${NEW_TOKEN}' },
        },
      },
    })

    await whenInstall({ mcps: ['github'], agents: ['cursor'] })

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
              "GITHUB_TOKEN": "\${env:NEW_TOKEN}"
            }
          }
        }
      }
      "
    `)
  })
})
