import { it, expect } from 'vitest'
import { readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'update / a lock entry without sourceUrl falls back to source',
  ({ givenSkill, whenInstall, whenUpdate, targetFiles, getTargetDir }) => {
    it('should restore the skill from `source` instead of crashing', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      // An old or hand-edited lock: the entry only knows its `source`
      const lockPath = join(getTargetDir(), 'ai-lock.json')
      const lock = JSON.parse(await readFile(lockPath, 'utf-8'))
      delete lock.skills.alpha.sourceUrl
      await writeFile(lockPath, JSON.stringify(lock, null, 2))
      await rm(join(getTargetDir(), '.claude/skills/alpha'))

      await whenUpdate()

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          "ai-lock.json",
        ]
      `)
    })
  },
)
