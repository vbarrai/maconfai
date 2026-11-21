import { mkdir, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { stripVTControlCharacters } from 'util'
import { it, expect, vi } from 'vitest'
import { describeConfai, skillFile } from '../test-utils.ts'

// The user is shown the menu and ticks nothing: we only look at what it offers.
const offered = vi.hoisted(() => [] as string[])
vi.mock('@clack/prompts', async (importActual) => ({
  ...(await importActual<typeof import('@clack/prompts')>()),
  multiselect: async ({ options }: { options: { label: string }[] }) => {
    // CI forces colors: drop them so the snapshot reads the same everywhere.
    offered.push(...options.map((o) => stripVTControlCharacters(o.label)))
    return []
  },
}))

describeConfai(
  'uninstall / a same-named user copy is not offered and the project lock stays',
  ({ givenSkill, whenInstall, whenUninstall, targetFile }) => {
    it('should offer only the project copy and keep the lock entry', async () => {
      await givenSkill('alpha')
      await whenInstall({ skills: ['alpha'], agents: ['claude-code'], mcps: [], hooks: [] })
      // tests/setup-fake-home.ts makes homedir() a temp dir, never the real home.
      const userCopy = join(homedir(), '.claude/skills/alpha')
      await mkdir(userCopy, { recursive: true })
      await writeFile(join(userCopy, 'SKILL.md'), skillFile('alpha'))

      await whenUninstall()

      expect(offered).toMatchInlineSnapshot(`
        [
          "alpha (Claude Code)",
        ]
      `)
      expect(await readdir(join(homedir(), '.claude/skills'))).toEqual(['alpha'])
      expect(Object.keys(JSON.parse(await targetFile('ai-lock.json')).skills)).toEqual(['alpha'])
    })
  },
)
