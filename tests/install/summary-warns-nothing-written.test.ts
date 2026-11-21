import { it, expect, vi } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpGithub, mcpLinear, hookBlockRmCursor } from '../test-utils.ts'

// Keep only the summary lines, without colors
async function summaryOf(run: () => Promise<void>): Promise<string> {
  let output = ''
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
    output += String(chunk)
    return true
  })
  try {
    await run()
  } finally {
    spy.mockRestore()
  }
  return output
    .replace(/\x1B\[\??[0-9;]*[a-zA-Z]/g, '')
    .split('\n')
    .filter((line) => /Installed|written/.test(line))
    .map((line) => line.trim())
    .join('\n')
}

describeConfai(
  'install / summary warns instead of "Installed 0"',
  ({ givenSource, whenInstall, getTargetDir }) => {
    it('should name what was written nowhere, with no green zero line', async () => {
      // A hand-written `github` server is left alone; the hook group is Cursor-only
      await writeFile(
        join(getTargetDir(), '.mcp.json'),
        JSON.stringify({ mcpServers: { github: { command: 'my-github' } } }),
      )
      await givenSource({
        mcps: { github: mcpGithub, linear: mcpLinear },
        hooks: hookBlockRmCursor,
      })

      const summary = await summaryOf(() => whenInstall({ agents: ['claude-code'] }))

      expect(summary).toMatchInlineSnapshot(`
        "◇  Installed 1 MCP server(s) for 1 agent(s)
        ▲  No MCP server written for these agents: github
        ▲  No hook written for these agents: block-rm"
      `)
    })
  },
)
