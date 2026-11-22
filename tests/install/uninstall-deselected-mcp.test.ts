import { it, expect, vi } from 'vitest'
import { describeConfai } from '../test-utils.ts'
import { runInstall } from '../../src/install.ts'

// Interactive run: the MCP list comes back with `linear` unchecked, every confirm says yes
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  multiselect: async (opts: any) =>
    opts.options.map((o: any) => o.value).filter((v: any) => v !== 'linear'),
  confirm: async () => true,
}))

describeConfai(
  'install / unchecking a MCP server removes it from config',
  ({ givenSource, whenInstall, getSourceDir, getTargetDir, targetFile }) => {
    it('should remove the MCP server unchecked in the interactive list', async () => {
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
          linear: { command: 'npx', args: ['-y', 'mcp-linear'] },
        },
      })

      await whenInstall({ mcps: ['github', 'linear'], agents: ['claude-code'] })

      const before = JSON.parse(await targetFile('.mcp.json'))
      expect(Object.keys(before.mcpServers)).toEqual(['github', 'linear'])

      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await runInstall([getSourceDir(), '--agents=claude-code'])
      } finally {
        process.chdir(originalCwd)
      }

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
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.mcpServers)).toEqual(['github'])
    })
  },
)
