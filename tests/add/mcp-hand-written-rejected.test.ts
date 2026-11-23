import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpGithub } from '../test-utils.ts'

describeConfai(
  'add mcp / a server of the same name written by hand',
  ({ givenSource, whenAdd, getTargetDir, targetFile }) => {
    it('should fail instead of reporting success, and leave the config alone', async () => {
      await givenSource({ mcpDirs: { github: mcpGithub } })
      const handWritten =
        '{\n  "mcpServers": {\n    "github": {\n      "command": "mine"\n    }\n  }\n}\n'
      await writeFile(join(getTargetDir(), '.mcp.json'), handWritten)

      await expect(
        whenAdd('mcp', ['github'], ['--agents=claude-code']),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: MCP server(s) already in an agent config of this project, not installed by maconfai: github]`,
      )

      expect(await targetFile('.mcp.json')).toBe(handWritten)
    })
  },
)
