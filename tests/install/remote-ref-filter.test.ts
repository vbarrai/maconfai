import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remote ref / --skills filter applies to remote ref skills',
  ({ givenSource, givenRemoteSkill, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should only resolve and install the filtered remote ref skill', async () => {
      const remoteA = await givenRemoteSkill('skill-a')
      const remoteB = await givenRemoteSkill('skill-b')
      await givenSource({
        remoteRefs: { 'skill-a': remoteA, 'skill-b': remoteB },
      })

      await whenInstall({ skills: ['skill-b'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/skill-b/SKILL.md', '.claude/skills/skill-b')
      await targetHasNoFiles('.agents/skills/skill-a/SKILL.md')
    })
  },
)
