import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --force replaces a hand-written skill of the same name',
  ({ givenSkill, getTargetDir, whenInstall, targetFile, targetFiles }) => {
    it('should replace the hand-written skill and record it in the lock', async () => {
      await givenSkill('beta')
      const handWritten = join(getTargetDir(), '.claude/skills/beta')
      await mkdir(handWritten, { recursive: true })
      await writeFile(join(handWritten, 'SKILL.md'), 'hand-written')

      await whenInstall({
        skills: ['beta'],
        agents: ['claude-code'],
        mcps: [],
        hooks: [],
        extraArgs: ['--force'],
      })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/beta/SKILL.md",
          ".claude/skills/beta",
          "ai-lock.json",
        ]
      `)
      expect(await targetFile('.claude/skills/beta/SKILL.md')).toMatchInlineSnapshot(`
        "---
        name: beta
        description: beta
        ---
        beta"
      `)
      expect(Object.keys(JSON.parse(await targetFile('ai-lock.json')).skills))
        .toMatchInlineSnapshot(`
        [
          "beta",
        ]
      `)
    })
  },
)
