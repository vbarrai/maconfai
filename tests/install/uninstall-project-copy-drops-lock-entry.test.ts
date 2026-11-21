import { mkdir, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { it, expect, vi } from 'vitest'
import { describeConfai, skillFile } from '../test-utils.ts'

// The user ticks everything the menu offers, then confirms.
vi.mock('@clack/prompts', async (importActual) => ({
  ...(await importActual<typeof import('@clack/prompts')>()),
  multiselect: async ({ options }: { options: { value: unknown }[] }) =>
    options.map((o) => o.value),
  confirm: async () => true,
}))

describeConfai(
  'uninstall / project copy drops its lock entry',
  ({ givenSkill, whenInstall, whenUninstall, targetFile, targetFiles }) => {
    it('should remove the project copy and its entry, and keep the user copy', async () => {
      await givenSkill('alpha')
      await whenInstall({ skills: ['alpha'], agents: ['claude-code'], mcps: [], hooks: [] })
      // tests/setup-fake-home.ts makes homedir() a temp dir, never the real home.
      const userCopy = join(homedir(), '.claude/skills/alpha')
      await mkdir(userCopy, { recursive: true })
      await writeFile(join(userCopy, 'SKILL.md'), skillFile('alpha'))

      await whenUninstall()

      expect(await readdir(join(homedir(), '.claude/skills'))).toEqual(['alpha'])
      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          "ai-lock.json",
        ]
      `)
      expect(Object.keys(JSON.parse(await targetFile('ai-lock.json')).skills)).toEqual([])
    })
  },
)
