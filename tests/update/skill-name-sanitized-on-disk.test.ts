import { it, expect } from 'vitest'
import { lstat } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'update / a skill installed under its sanitized name is not missing',
  ({ givenSkill, whenInstall, whenUpdate, targetFiles, getTargetDir }) => {
    it('should not reinstall "My Skill", installed as .claude/skills/my-skill', async () => {
      await givenSkill('My Skill')
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      const mtimes = async () => {
        const files = await targetFiles()
        const stats = await Promise.all(files.map((f) => lstat(join(getTargetDir(), f))))
        return Object.fromEntries(files.map((f, i) => [f, stats[i]!.mtimeMs]))
      }
      const before = await mtimes()

      await whenUpdate()

      expect(await mtimes()).toEqual(before)
      expect(Object.keys(before)).toMatchInlineSnapshot(`
        [
          ".agents/skills/my-skill/SKILL.md",
          ".claude/skills/my-skill",
          "ai-lock.json",
        ]
      `)
    })
  },
)
