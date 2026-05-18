import { it, expect } from 'vitest'
import { describeConfai, remoteRefYaml } from '../test-utils.ts'

describeConfai(
  'remote ref / basic install via skills/<name>.yml ref file',
  ({ givenSource, givenRemoteSkill, whenInstall, targetHasFiles }) => {
    it('should resolve and install a skill from a YAML ref file', async () => {
      const remoteDir = await givenRemoteSkill('skill-creator')
      await givenSource({ remoteRefs: { 'skill-creator': remoteRefYaml({ source: remoteDir }) } })

      await whenInstall({ skills: ['skill-creator'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/skill-creator/SKILL.md', '.claude/skills/skill-creator')
    })
  },
)
