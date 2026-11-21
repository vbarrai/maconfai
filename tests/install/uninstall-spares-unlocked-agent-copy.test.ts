import { it, expect, vi } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
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
  'uninstall / no source spares a same-named copy for an agent the lock omits',
  ({ givenSkill, whenInstall, whenUninstall, getTargetDir, targetFiles }) => {
    it('should only remove the copies of the agents recorded in the lock', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'] })

      // A hand-written Cursor skill with the same name, unknown to the lock entry
      await mkdir(join(getTargetDir(), '.cursor/skills/alpha'), { recursive: true })
      await writeFile(join(getTargetDir(), '.cursor/skills/alpha/SKILL.md'), skillFile('alpha'))

      await whenUninstall()

      expect(offered).toMatchInlineSnapshot(`
        [
          "alpha (Claude Code)",
        ]
      `)
      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".cursor/skills/alpha/SKILL.md",
          "ai-lock.json",
        ]
      `)
    })
  },
)
