import { it, expect, vi, afterEach } from 'vitest'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { runInstall } from '../../src/install.ts'
import { describeConfai } from '../test-utils.ts'

// A fake $HOME with only ~/.claude: this machine has no Cursor.
const fakeHome = vi.hoisted(() => {
  delete process.env.CLAUDE_CONFIG_DIR
  delete process.env.CODEX_HOME
  return `${(process.env.TMPDIR ?? '/tmp').replace(/\/+$/, '')}/maconfai-fake-home-${process.pid}-interactive`
})
vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('os')>()),
  homedir: () => fakeHome,
}))

// Every prompt is answered with Enter: the pre-checked values, or yes.
const shown: Record<string, unknown[]> = {}
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@clack/prompts')>()),
  multiselect: async (opts: { message: string; initialValues?: unknown[] }) => {
    shown[opts.message.split(' ')[1]!] = opts.initialValues ?? []
    return opts.initialValues ?? []
  },
  confirm: async () => true,
}))

afterEach(() => rm(fakeHome, { recursive: true, force: true }))

describeConfai(
  'install / interactive pre-checks the agents a project already targets',
  ({ givenSkill, whenInstall, getSourceDir, getTargetDir, targetFiles }) => {
    it('keeps Cursor checked and installed when ~/.cursor is missing', async () => {
      await mkdir(join(fakeHome, '.claude'), { recursive: true })
      await givenSkill('alpha')
      await whenInstall({ skills: ['alpha'], agents: ['claude-code', 'cursor'] })

      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await runInstall([getSourceDir()])
      } finally {
        process.chdir(originalCwd)
      }

      expect(shown.agents).toMatchInlineSnapshot(`
        [
          "claude-code",
          "cursor",
        ]
      `)
      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          ".cursor/skills/alpha",
          "ai-lock.json",
        ]
      `)
    })
  },
)
