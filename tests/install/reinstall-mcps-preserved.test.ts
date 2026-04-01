import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / reinstall preserves MCPs from previous install',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should keep MCPs on second install', async () => {
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
        },
      })

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      await targetHasFiles('.mcp.json', 'ai-lock.json')

      // Second install — MCPs should still be there
      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "github": {
              "command": "npx",
              "args": [
                "-y",
                "@mcp/github"
              ]
            }
          }
        }
        "
      `)
    })
  },
)
