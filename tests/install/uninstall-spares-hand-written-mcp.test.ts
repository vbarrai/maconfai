import { it, expect, vi } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpGithub } from '../test-utils.ts'

// The user ticks everything the menu offers, then confirms.
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@clack/prompts')>()),
  multiselect: async (opts: any) => opts.options.map((o: any) => o.value),
  confirm: async () => true,
}))

describeConfai(
  'uninstall / no source spares a same-named MCP server of an agent the lock omits',
  ({ givenSource, whenInstall, whenUninstall, getTargetDir, targetFile }) => {
    it('should only clean the agent configs recorded in the lock', async () => {
      await givenSource({ mcpDirs: { github: mcpGithub } })
      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      // Written by hand for Cursor, unknown to the lock entry
      const handWritten =
        '{\n  "mcpServers": {\n    "github": {\n      "command": "mine"\n    }\n  }\n}\n'
      await mkdir(join(getTargetDir(), '.cursor'), { recursive: true })
      await writeFile(join(getTargetDir(), '.cursor/mcp.json'), handWritten)

      await whenUninstall()

      expect(await targetFile('.cursor/mcp.json')).toBe(handWritten)
      expect(JSON.parse(await targetFile('.mcp.json')).mcpServers).toEqual({})
      expect(JSON.parse(await targetFile('ai-lock.json')).mcpServers).toEqual({})
    })
  },
)
