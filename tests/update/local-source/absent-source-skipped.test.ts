import { it, expect, vi } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../../test-utils.ts'

const logs = vi.hoisted(() => [] as string[])
vi.mock('@clack/prompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clack/prompts')>()
  const capture = (level: string) => (msg: string) => void logs.push(`${level}: ${msg}`)
  const levels = ['info', 'success', 'message', 'warn', 'error'] as const
  return { ...actual, log: Object.fromEntries(levels.map((l) => [l, capture(l)])) }
})

describeConfai(
  'update / local source / a source not on this machine is skipped',
  ({ givenSkill, whenInstall, whenUpdate, getSourceDir, getTargetDir }) => {
    it('should report the entry as skipped, not as a failure', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      // A lock committed by someone else: its local source path does not exist here
      await rm(getSourceDir(), { recursive: true })
      await rm(join(getTargetDir(), '.claude/skills/alpha'))

      logs.length = 0
      await whenUpdate()

      const output = logs
        .join('\n')
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replaceAll(getSourceDir(), '<source>')
      expect(output).toMatchInlineSnapshot(`
        "warn: 1 item(s) skipped — local source not found on this machine
        message:   - alpha (<source>)"
      `)
    })
  },
)
