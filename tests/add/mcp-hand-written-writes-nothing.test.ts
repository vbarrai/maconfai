import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpGithub, mcpLinearUrl } from '../test-utils.ts'

describeConfai(
  'add mcp / a hand-written server of the same name on one of the agents',
  ({ givenSource, whenAdd, getTargetDir, targetFile, targetFiles }) => {
    it('should fail before writing any of the requested servers', async () => {
      await givenSource({ mcpDirs: { github: mcpGithub, linear: mcpLinearUrl } })
      const handWritten =
        '{\n  "mcpServers": {\n    "github": {\n      "command": "mine"\n    }\n  }\n}\n'
      await mkdir(join(getTargetDir(), '.cursor'), { recursive: true })
      await writeFile(join(getTargetDir(), '.cursor/mcp.json'), handWritten)

      await expect(
        whenAdd('mcp', ['linear', 'github'], ['--agents=claude-code,cursor']),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: MCP server(s) already in an agent config of this project, not installed by maconfai: github]`,
      )

      // Not even `linear`, the server with no conflict: nothing half-applied
      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".cursor/mcp.json",
        ]
      `)
      expect(await targetFile('.cursor/mcp.json')).toBe(handWritten)
    })
  },
)
