import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai('open-code / skip existing MCP', ({ givenSource, whenInstall, targetFile }) => {
  it('should preserve existing MCP server and not overwrite', async () => {
    await givenSource({
      mcps: {
        linear: mcpLinear,
      },
    })

    await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

    // Install again with different config for same name
    await givenSource({
      mcps: {
        linear: {
          command: 'node',
          args: ['different-server.js'],
        },
      },
    })

    await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

    // Original config should be preserved
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
})
