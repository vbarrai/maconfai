import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

// `constructor` is inherited by every object: the lock lookup must not mistake it for an entry.
describeConfai(
  'install / a hand-written skill named like an Object property is still unmanaged',
  ({ givenSkill, getTargetDir, whenInstall, targetFile }) => {
    it('should keep a hand-written `constructor` skill left out of --skills', async () => {
      await givenSkill('alpha', 'constructor')
      const handWritten = join(getTargetDir(), '.claude/skills/constructor')
      await mkdir(handWritten, { recursive: true })
      await writeFile(
        join(handWritten, 'SKILL.md'),
        '---\nname: constructor\ndescription: mine\n---\nmine',
      )

      await whenInstall({ skills: ['alpha'], agents: ['claude-code'], mcps: [], hooks: [] })

      expect(await targetFile('.claude/skills/constructor/SKILL.md')).toMatchInlineSnapshot(`
        "---
        name: constructor
        description: mine
        ---
        mine"
      `)
    })
  },
)
