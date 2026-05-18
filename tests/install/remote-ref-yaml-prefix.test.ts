import { it, expect } from 'vitest'
import { describeConfai, remoteRefYaml } from '../test-utils.ts'

describeConfai(
  'remote ref yaml / prefix renames the installed skill',
  ({
    givenSource,
    givenRemoteSkill,
    whenInstall,
    targetHasFiles,
    targetHasNoFiles,
    targetFile,
  }) => {
    it('should install under prefixed directory and update frontmatter name', async () => {
      const remoteDir = await givenRemoteSkill('skill-creator')
      await givenSource({
        remoteRefs: {
          'skill-creator': remoteRefYaml({ source: remoteDir, prefix: 'official' }),
        },
      })

      await whenInstall({ skills: ['official-skill-creator'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/official-skill-creator/SKILL.md',
        '.claude/skills/official-skill-creator',
      )
      await targetHasNoFiles('.agents/skills/skill-creator/SKILL.md')

      const skillMd = await targetFile('.agents/skills/official-skill-creator/SKILL.md')
      expect(skillMd).toContain('name: official-skill-creator')
    })
  },
)
