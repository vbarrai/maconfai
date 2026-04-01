import { it, expect } from 'vitest'
import { describeConfai, mcpGithub } from '../../test-utils.ts'

describeConfai(
  'claude-code / install zero MCPs',
  ({ givenSource, sourceFiles, whenInstall, targetFiles }) => {
    it('installs nothing when mcps is empty', async () => {
      await givenSource({
        mcps: {
          github: mcpGithub,
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await whenInstall({ mcps: [], agents: ['claude-code'] })

      expect(await targetFiles()).toHaveLength(0)
    })
  },
)
