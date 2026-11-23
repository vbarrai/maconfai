import { it, expect, vi } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, hookBlockRmClaudeCode, hookBlockRmCursor } from '../test-utils.ts'

// Keep only the hooks summary line, without colors
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
  return output
    .replace(/\x1B\[\??[0-9;]*[a-zA-Z]/g, '')
    .split('\n')
    .filter((line) => /Installed .* hook\(s\)/.test(line))
    .map((line) => line.trim())
    .join('\n')
}

describeConfai(
  'install / hook summary skips an agent that already had the same hook',
  ({ givenSource, whenInstall, getTargetDir }) => {
    it('should not count an agent where nothing was written', async () => {
      // Claude Code already runs the exact same handler: installing writes nothing there
      const targetDir = getTargetDir()
      await mkdir(join(targetDir, '.claude'), { recursive: true })
      await writeFile(
        join(targetDir, '.claude', 'settings.json'),
        JSON.stringify({ hooks: hookBlockRmClaudeCode['block-rm']!['claude-code'] }),
      )
      await givenSource({
        hooks: {
          'block-rm': { ...hookBlockRmClaudeCode['block-rm']!, ...hookBlockRmCursor['block-rm']! },
        },
      })

      const summary = await hookSummaryOf(() =>
        whenInstall({ hooks: ['block-rm'], agents: ['claude-code', 'cursor'] }),
      )

      expect(summary).toMatchInlineSnapshot(`"◇  Installed 1 hook(s) for 1 agent(s)"`)
    })
  },
)
