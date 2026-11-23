import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpGithub } from '../test-utils.ts'

describeConfai(
  'remove mcp / an entry written by install next to a hand-written server',
  ({ givenSource, whenInstall, whenRemove, getTargetDir, targetFile }) => {
    it('should record only the agent install wrote to, and keep the hand-written one', async () => {
      await givenSource({ mcpDirs: { github: mcpGithub } })
      const handWritten =
        '{\n  "mcpServers": {\n    "github": {\n      "command": "mine"\n    }\n  }\n}\n'
      await mkdir(join(getTargetDir(), '.cursor'), { recursive: true })
      await writeFile(join(getTargetDir(), '.cursor/mcp.json'), handWritten)

      await whenInstall({ mcps: ['github'], agents: ['claude-code', 'cursor'] })
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(lock.mcpServers.github.agents).toMatchInlineSnapshot(`
        [
          "claude-code",
        ]
      `)

      await whenRemove('mcp', ['github'])

      expect(await targetFile('.cursor/mcp.json')).toBe(handWritten)
      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
        "{
          "mcpServers": {}
        }
        "
      `)
    })
  },
)
