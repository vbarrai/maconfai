import { it, expect, vi } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

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
    .filter((line) => /Installed|Failed: \d/.test(line))
    .map((line) => line.trim())
    .join('\n')
}

describeConfai(
  'install / failed summary counts skill copies, not skills',
  ({ givenSkill, whenInstall, getTargetDir }) => {
    it('should not read as more skills failing when only one agent failed', async () => {
      // A file where Cursor's skills dir should be: every copy for Cursor fails
      const targetDir = getTargetDir()
      await mkdir(join(targetDir, '.cursor'), { recursive: true })
      await writeFile(join(targetDir, '.cursor', 'skills'), 'not a directory')
      await givenSkill('alpha', 'beta')

      const summary = await summaryOf(() => whenInstall({ agents: ['claude-code', 'cursor'] }))

      expect(summary).toMatchInlineSnapshot(`
        "◆  Installed 2 skill(s) for 1 agent(s)
        ■  Failed: 2 skill copy(ies) for 1 agent(s)"
      `)
    })
  },
)
