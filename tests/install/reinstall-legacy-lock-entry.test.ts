import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, skillFile } from '../test-utils.ts'

// A lock entry written before `agents` was recorded still marks the skill as managed.
describeConfai(
  'install / a lock entry without agents is still a managed skill',
  ({ givenSkill, getSourceDir, getTargetDir, whenInstall, targetFile }) => {
    it('should update the skill without --force', async () => {
      await givenSkill('beta')
      await whenInstall({ skills: ['beta'], agents: ['claude-code'], mcps: [], hooks: [] })
      const lockPath = join(getTargetDir(), 'ai-lock.json')
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      delete lock.skills.beta.agents
      await writeFile(lockPath, JSON.stringify(lock))

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
