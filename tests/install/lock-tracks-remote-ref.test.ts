import { it, expect } from 'vitest'
import { describeConfai, remoteRefYaml } from '../test-utils.ts'

describeConfai(
  'remote ref / lock tracks the remote source, not the intermediate repo',
  ({ givenSource, givenRemoteSkill, whenInstall, targetFile }) => {
    it('should record the remote ref path as source in ai-lock.json', async () => {
      const remoteDir = await givenRemoteSkill('skill-creator')
      await givenSource({ remoteRefs: { 'skill-creator': remoteRefYaml({ source: remoteDir }) } })

      await whenInstall({ skills: ['skill-creator'], agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(lock.skills['skill-creator'].sourceUrl).toBe(remoteDir)
    })
  },
)
