import { it, expect } from 'vitest'
import { appendFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'update / local source / a change in the source is applied',
  ({ givenSkill, whenInstall, whenUpdate, targetFile, getSourceDir }) => {
    it('should copy the edited skill from a local source that is not a git repo', async () => {
      await givenSkill('alpha')
      await whenInstall({ skills: ['alpha'], agents: ['claude-code'], extraArgs: ['--trusted'] })

      await appendFile(join(getSourceDir(), 'skills/alpha/SKILL.md'), '\nedited in the source\n')
      await whenUpdate()

      expect(await targetFile('.claude/skills/alpha/SKILL.md')).toMatchInlineSnapshot(`
        "---
        name: alpha
        description: alpha
        ---
        alpha
        edited in the source
        "
      `)
    })
  },
)
