import { it, expect, vi } from 'vitest'
import { mkdir, writeFile, readdir } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { describeConfai, skillFile } from '../test-utils.ts'

// The labels the interactive uninstall offers (every one is selected, then confirmed).
const { offered } = vi.hoisted(() => ({ offered: [] as string[] }))

vi.mock('@clack/prompts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@clack/prompts')>()),
  multiselect: async (opts: any) => {
    offered.push(...opts.options.map((o: any) => o.label.replace(/\x1B\[[0-9;]*m/g, '')))
    return opts.options.map((o: any) => o.value)
  },
  confirm: async () => true,
}))

describeConfai(
  'uninstall / no source spares user and hand-written skills',
  ({ givenSkill, whenInstall, whenUninstall, getTargetDir, targetFiles }) => {
    it('should only offer and remove the skills recorded in the lock', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'] })

      // A personal user skill (tests/setup-fake-home.ts makes homedir() a temp dir) and a
      // hand-written project skill, both unknown to the lock
      const userSkills = join(homedir(), '.claude/skills')
      await mkdir(join(userSkills, 'my-personal'), { recursive: true })
      await writeFile(join(userSkills, 'my-personal/SKILL.md'), skillFile('my-personal'))
      await mkdir(join(getTargetDir(), '.claude/skills/our-own'), { recursive: true })
      await writeFile(join(getTargetDir(), '.claude/skills/our-own/SKILL.md'), skillFile('our-own'))

      await whenUninstall()

      expect(offered).toMatchInlineSnapshot(`
        [
          "alpha (Claude Code)",
        ]
      `)
      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".claude/skills/our-own/SKILL.md",
          "ai-lock.json",
        ]
      `)
      expect(await readdir(userSkills)).toEqual(['my-personal'])
    })
  },
)
