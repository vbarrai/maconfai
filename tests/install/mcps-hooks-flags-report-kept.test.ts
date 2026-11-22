import { it, expect, vi } from 'vitest'
import { stripVTControlCharacters } from 'util'
import { describeConfai, hookBlockRm, hookLintOnEdit } from '../test-utils.ts'

describeConfai(
  'install / --mcps and --hooks say which installed configs they kept',
  ({ givenSource, whenInstall }) => {
    it('should print the installed MCP servers and hooks it does not remove', async () => {
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
          linear: { command: 'npx', args: ['-y', 'mcp-linear'] },
        },
        hooks: { ...hookBlockRm, ...hookLintOnEdit },
      })
      await whenInstall({ agents: ['claude-code'] })

      let output = ''
      const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
        output += String(chunk)
        return true
      })
      try {
        await whenInstall({ mcps: ['github'], hooks: ['lint-on-edit'], agents: ['claude-code'] })
      } finally {
        spy.mockRestore()
      }

      const kept = stripVTControlCharacters(output)
        .split('\n')
        .filter((line) => line.includes('Kept'))
      expect(kept).toMatchInlineSnapshot(`
        [
          "●  Kept 1 installed MCP server(s) not in --mcps: linear (remove with: maconfai remove mcp <name>)",
          "●  Kept 1 installed hook(s) not in --hooks: block-rm (remove with: maconfai remove hook <name>)",
        ]
      `)
    })
  },
)
