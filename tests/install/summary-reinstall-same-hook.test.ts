import { it, expect, vi } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

// Keep only the hook summary lines, without colors
async function hookSummaryOf(run: () => Promise<void>): Promise<string> {
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
      .filter((line) => /[Hh]ooks? /.test(line) && !/Found/.test(line))
      .map((line) => line.trim())
      .join('\n')
  )
}

describeConfai(
  'install / hook summary on a re-install that changes nothing',
  ({ givenSource, whenInstall }) => {
    it('should say the hooks are already installed, without a warning', async () => {
      await givenSource({ hooks: hookBlockRm })
      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      const summary = await hookSummaryOf(() =>
        whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] }),
      )

      expect(summary).toMatchInlineSnapshot(`"◇  Hooks already installed"`)
    })
  },
)
