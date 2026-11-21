import { mkdir, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { it, expect, vi } from 'vitest'
import { describeConfai, skillFile } from '../test-utils.ts'

const multiselect = vi.hoisted(() => vi.fn(async () => []))
vi.mock('@clack/prompts', async (importActual) => ({
  ...(await importActual<typeof import('@clack/prompts')>()),
  multiselect,
}))

describeConfai(
  'uninstall / skills only in the user scope are never offered nor removed',
  ({ whenUninstall }) => {
    it('should leave ~/.claude/skills and ~/.agents/skills alone', async () => {
      // tests/setup-fake-home.ts makes homedir() a temp dir, never the real home.
      const userDirs = ['.claude/skills', '.agents/skills'].map((d) => join(homedir(), d))
      for (const dir of userDirs) {
        await mkdir(join(dir, 'perso'), { recursive: true })
        await writeFile(join(dir, 'perso/SKILL.md'), skillFile('perso'))
      }

      await whenUninstall()

      // Nothing to offer in the project, so no menu at all.
      expect(multiselect).not.toHaveBeenCalled()
      expect(await Promise.all(userDirs.map((dir) => readdir(dir)))).toEqual([['perso'], ['perso']])
    })
  },
)
