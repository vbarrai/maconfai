import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remote ref / basic install via skills/<name> ref file',
  ({ givenSource, givenRemoteSkill, whenInstall, targetHasFiles }) => {
    it('should resolve and install a skill from a remote ref file', async () => {
      const remoteDir = await givenRemoteSkill('skill-creator')
      await givenSource({ remoteRefs: { 'skill-creator': remoteDir } })

      await whenInstall({ skills: ['skill-creator'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/skill-creator/SKILL.md', '.claude/skills/skill-creator')
    })
  },
)
