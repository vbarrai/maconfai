import { it, expect } from 'vitest'
import { describeConfai, mcpGithub, mcpLinear } from '../../test-utils.ts'

describeConfai('open-code / merge MCPs', ({ givenSource, whenInstall, targetFile }) => {
  it('should merge MCP servers from sequential installs', async () => {
    await givenSource({
      mcps: {
        linear: mcpLinear,
      },
    })

    await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

    await givenSource({
      mcps: {
        github: mcpGithub,
      },
    })

    await whenInstall({ mcps: ['github'], agents: ['open-code'] })

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
          },
          "github": {
            "type": "local",
            "command": [
              "npx",
              "-y",
              "@modelcontextprotocol/server-github"
            ]
          }
        }
      }
      "
    `)
  })
})
