import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remote ref / mixed normal skills and remote ref skills',
  ({ givenSource, givenRemoteSkill, whenInstall, targetHasFiles }) => {
    it('should install both local and remote ref skills', async () => {
      const remoteDir = await givenRemoteSkill('skill-creator')
      await givenSource({
        skills: [{ name: 'lint' }],
        remoteRefs: { 'skill-creator': remoteDir },
      })

      await whenInstall({ skills: ['lint', 'skill-creator'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/lint/SKILL.md',
        '.claude/skills/lint',
        '.agents/skills/skill-creator/SKILL.md',
        '.claude/skills/skill-creator',
      )
    })
  },
)
