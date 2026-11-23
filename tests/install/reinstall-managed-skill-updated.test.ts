import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, skillFile } from '../test-utils.ts'

describeConfai(
  'install / a skill already in the lock is updated without --force',
  ({ givenSkill, getSourceDir, whenInstall, targetFile }) => {
    it('should replace the managed skill with the new source content', async () => {
      await givenSkill('beta')
      await whenInstall({ skills: ['beta'], agents: ['claude-code'], mcps: [], hooks: [] })

      await writeFile(join(getSourceDir(), 'skills/beta/SKILL.md'), `${skillFile('beta')}\nv2`)
      await whenInstall({ skills: ['beta'], agents: ['claude-code'], mcps: [], hooks: [] })

      expect(await targetFile('.claude/skills/beta/SKILL.md')).toMatchInlineSnapshot(`
        "---
        name: beta
        description: beta
        ---
        beta
        v2"
      `)
    })
  },
)
