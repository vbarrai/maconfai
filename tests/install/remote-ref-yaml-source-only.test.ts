import { it, expect } from 'vitest'
import { describeConfai, remoteRefYaml } from '../test-utils.ts'

describeConfai(
  'remote ref yaml / source-only (no include, no prefix) behaves like plain string',
  ({ givenSource, givenRemoteSkill, whenInstall, targetHasFiles }) => {
    it('should install the skill from a YAML ref with only source:', async () => {
      const remoteDir = await givenRemoteSkill('skill-creator')
      await givenSource({
        remoteRefs: {
          'skill-creator': remoteRefYaml({ source: remoteDir }),
        },
      })

      await whenInstall({ skills: ['skill-creator'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/skill-creator/SKILL.md', '.claude/skills/skill-creator')
    })
  },
)
