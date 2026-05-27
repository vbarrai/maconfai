import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai('open-code / skip existing MCP', ({ givenSource, whenInstall, targetFile }) => {
  it('overwrites a maconfai-managed MCP when reinstalled with new config', async () => {
    await givenSource({
      mcps: {
        linear: mcpLinear,
      },
    })

    await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

    await givenSource({
      mcps: {
        linear: {
          command: 'node',
          args: ['different-server.js'],
        },
      },
    })

    await whenInstall({ mcps: ['linear'], agents: ['open-code'] })

    expect(await targetFile('opencode.json')).toMatchInlineSnapshot(`
      "{
        "mcp": {
          "linear": {
            "type": "local",
            "command": [
              "node",
              "different-server.js"
            ]
          }
        }
      }
      "
    `)
  })
})
