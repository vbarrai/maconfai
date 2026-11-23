import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock hash is computed from the files of a local source',
  ({ givenSkill, whenInstall, targetFile }) => {
    it('should write the git tree hash of the skill folder, even outside a git repo', async () => {
      await givenSkill('my-skill')

      await whenInstall({ skills: ['my-skill'], agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))

      // Same value as `git rev-parse HEAD:skills/my-skill` once that folder is committed
      expect(lock.skills['my-skill'].skillFolderHash).toMatchInlineSnapshot(
        `"44a1110d485ff60168a40f06594a22af8d306a89"`,
      )
    })
  },
)
