import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from '../status/status-test-utils.ts'

const guard = (command: string) => ({
  'claude-code': { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command }] }] },
})

describeConfai(
  'update / an updated hook keeps its handlers in the lock',
  ({
    givenSource,
    whenInstall,
    whenUpdate,
    whenRemove,
    targetFile,
    getSourceDir,
    getTargetDir,
  }) => {
    it('should record the new handlers, so status can check them and remove can find them', async () => {
      await givenSource({ hookDirs: { guard: guard('guard-v1') } })
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      await writeFile(
        join(getSourceDir(), 'hooks/guard/hooks.json'),
        JSON.stringify({ hooks: { guard: guard('guard-v2') } }),
      )
      await whenUpdate()

      expect(JSON.parse(await targetFile('ai-lock.json')).hooks.guard.handlers).toEqual(
        guard('guard-v2'),
      )
      expect(await statusOf(getTargetDir(), getSourceDir())).toContain('claude-code  present')

      await whenRemove('hook', ['guard'])

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{}
        "
      `)
    })
  },
)
