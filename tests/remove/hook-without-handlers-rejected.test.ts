import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remove hook / a lock entry written before handlers were recorded',
  ({ givenSource, whenAdd, whenRemove, getTargetDir, targetFile }) => {
    it('should refuse rather than drop the entry and leave its handlers behind', async () => {
      await givenSource({
        hookDirs: {
          guard: {
            'claude-code': {
              PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'guard' }] }],
            },
          },
        },
      })
      await whenAdd('hook', ['guard'], ['--agents=claude-code'])
      // Older maconfai versions did not write `handlers`
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      delete lock.hooks.guard.handlers
      await writeFile(join(getTargetDir(), 'ai-lock.json'), JSON.stringify(lock))
      const settingsBefore = await targetFile('.claude/settings.json')

      await expect(whenRemove('hook', ['guard'])).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot remove guard: its ai-lock.json entry predates recorded handlers. Reinstall it with \`maconfai add hook\`, then remove it.]`,
      )

      expect(await targetFile('.claude/settings.json')).toBe(settingsBefore)
      expect(Object.keys(JSON.parse(await targetFile('ai-lock.json')).hooks)).toEqual(['guard'])
    })
  },
)
