import { it, expect } from 'vitest'
import { lstat, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'update / local source / a .DS_Store in the source is not a change',
  ({ givenSkill, whenInstall, whenUpdate, targetFiles, getSourceDir, getTargetDir }) => {
    it('should rewrite nothing when Finder drops a .DS_Store into the skill folder', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      await writeFile(join(getSourceDir(), 'skills/alpha/.DS_Store'), 'finder state')
      const mtimes = async () => {
        const files = await targetFiles()
        const stats = await Promise.all(files.map((f) => lstat(join(getTargetDir(), f))))
        return Object.fromEntries(files.map((f, i) => [f, stats[i]!.mtimeMs]))
      }
      const before = await mtimes()

      await whenUpdate()

      expect(await mtimes()).toEqual(before)
    })
  },
)
