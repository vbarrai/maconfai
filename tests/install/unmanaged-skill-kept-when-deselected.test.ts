import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / a hand-written skill left out of --skills is not removed',
  ({ givenSkill, getTargetDir, whenInstall, targetFile, targetFiles }) => {
    it('should install the selected skill and keep the hand-written one', async () => {
      await givenSkill('alpha', 'beta')
      const handWritten = join(getTargetDir(), '.claude/skills/beta')
      await mkdir(handWritten, { recursive: true })
      await writeFile(
        join(handWritten, 'SKILL.md'),
        '---\nname: beta\ndescription: mine\n---\nmine',
      )

      await whenInstall({ skills: ['alpha'], agents: ['claude-code'], mcps: [], hooks: [] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          ".claude/skills/beta/SKILL.md",
          "ai-lock.json",
        ]
      `)
      expect(await targetFile('.claude/skills/beta/SKILL.md')).toMatchInlineSnapshot(`
        "---
        name: beta
        description: mine
        ---
        mine"
      `)
    })
  },
)
