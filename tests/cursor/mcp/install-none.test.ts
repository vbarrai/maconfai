import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('cursor / install zero MCPs', ({ givenSource, sourceFiles, when, targetFiles }) => {
  it('installs nothing when mcps is empty', async () => {
    await givenSource({
      mcps: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
        },
      },
    })

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

    await when({ mcps: [], agents: ['cursor'] })

    expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
  })
})
