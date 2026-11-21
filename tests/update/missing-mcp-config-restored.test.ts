import { it, expect } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpLinearUrl } from '../test-utils.ts'

describeConfai(
  'update / a tracked MCP config removed from disk is restored',
  ({ givenSource, whenInstall, whenUpdate, targetFile, getTargetDir }) => {
    it('should write .mcp.json again at an unchanged hash', async () => {
      await givenSource({ mcpDirs: { linear: mcpLinearUrl } })
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      await rm(join(getTargetDir(), '.mcp.json'))
      await whenUpdate()

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "linear": {
              "url": "https://mcp.linear.app/sse"
            }
          }
        }
        "
      `)
    })
  },
)
