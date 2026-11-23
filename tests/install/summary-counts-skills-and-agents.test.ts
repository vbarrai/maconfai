import { it, expect, vi } from 'vitest'
import {
  describeConfai,
  mcpGithub,
  hookBlockRmClaudeCode,
  hookBlockRmCursor,
} from '../test-utils.ts'

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
  return (
    output
      .replace(/\x1B\[\??[0-9;]*[a-zA-Z]/g, '')
      // Spinner frames depend on timing
      .replace(/[◒◐◓◑]  [^\n◇◆]*/g, '')
      .split('\n')
      .filter((line) => /Installed|Removed/.test(line))
      .map((line) => line.trim())
      .join('\n')
  )
}

describeConfai(
  'install / summary counts skills and agents apart',
  ({ givenSource, whenInstall }) => {
    it('should count each skill once and name how many agents got it', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }],
        mcps: { github: mcpGithub },
        // No codex key: the hook reaches two agents out of three
        hooks: {
          'block-rm': { ...hookBlockRmClaudeCode['block-rm']!, ...hookBlockRmCursor['block-rm']! },
        },
      })

      const summary = await summaryOf(() =>
        whenInstall({ agents: ['claude-code', 'cursor', 'codex'] }),
      )

      expect(summary).toMatchInlineSnapshot(`
        "◆  Installed 3 skill(s) for 3 agent(s)
        ◇  Installed 1 MCP server(s) for 3 agent(s)
        ◇  Installed 1 hook(s) for 2 agent(s)"
      `)
    })
  },
)
