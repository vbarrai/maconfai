import { it, expect } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpLinearUrl } from '../test-utils.ts'
import { statusText } from '../../src/status.ts'
import { guardFiles, hookGuard } from './status-test-utils.ts'

describeConfai(
  'status / read-only',
  ({ givenSource, whenInstall, targetFiles, targetFile, getTargetDir }) => {
    it('should leave every file untouched, even when things are missing', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcpDirs: { linear: mcpLinearUrl },
        hookDirs: hookGuard,
        hookDirFiles: guardFiles,
      })
      await whenInstall({ agents: ['claude-code', 'cursor'] })
      await rm(join(getTargetDir(), '.claude/skills/alpha'))
      await rm(join(getTargetDir(), '.cursor/hooks.json'))

      const filesBefore = await targetFiles()
      const lockBefore = await targetFile('ai-lock.json')
      const settingsBefore = await targetFile('.claude/settings.json')

      await statusText(getTargetDir())

      expect(await targetFiles()).toEqual(filesBefore)
      expect(await targetFile('ai-lock.json')).toBe(lockBefore)
      expect(await targetFile('.claude/settings.json')).toBe(settingsBefore)
    })
  },
)
