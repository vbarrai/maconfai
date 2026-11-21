import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remove skill / a hand-written skill of the same name for another agent',
  ({ givenSkill, whenAdd, whenRemove, getTargetDir, targetFiles }) => {
    it('should remove only the recorded agents and keep the hand-written copy', async () => {
      await givenSkill('alpha')
      await whenAdd('skill', ['alpha'], ['--agents=claude-code'])
      // Written by hand for Cursor: never recorded in the lock, not a symlink to .agents/skills
      await mkdir(join(getTargetDir(), '.cursor/skills/alpha'), { recursive: true })
      await writeFile(join(getTargetDir(), '.cursor/skills/alpha/SKILL.md'), 'mine')

      await whenRemove('skill', ['alpha'])

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".cursor/skills/alpha/SKILL.md",
          "ai-lock.json",
        ]
      `)
    })
  },
)
