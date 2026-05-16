import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remote ref / circular reference detection',
  ({ givenSource, givenRemoteSkill, givenRemoteRef, whenInstall, targetFiles }) => {
    it('should skip and not crash when the remote repo is itself a ref (direct circular)', async () => {
      const circularDir = await givenRemoteRef('skill-x', './anywhere')
      await givenSource({ remoteRefs: { 'skill-x': circularDir } })

      await whenInstall({ skills: ['skill-x'], agents: ['claude-code'] })

      expect(await targetFiles()).toEqual([])
    })

    it('should install valid skills and skip only the circular one', async () => {
      const circularDir = await givenRemoteRef('skill-x', './anywhere')
      const goodDir = await givenRemoteSkill('lint')
      await givenSource({
        remoteRefs: { 'skill-x': circularDir, lint: goodDir },
      })

      await whenInstall({ skills: ['lint', 'skill-x'], agents: ['claude-code'] })

      const files = await targetFiles()
      expect(files).toContain('.agents/skills/lint/SKILL.md')
      expect(files).not.toContain('.agents/skills/skill-x/SKILL.md')
    })
  },
)
