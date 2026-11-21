import { it, expect } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { guardFiles, hookGuard, statusOf } from './status-test-utils.ts'

describeConfai(
  'status / deleted hooks config file',
  ({ givenSource, whenInstall, getSourceDir, getTargetDir }) => {
    it('should report the agent whose hooks file was deleted as missing', async () => {
      await givenSource({ hookDirs: hookGuard, hookDirFiles: guardFiles })
      await whenInstall({ agents: ['claude-code', 'cursor'] })

      await rm(join(getTargetDir(), '.cursor/hooks.json'))

      expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(`
        "Scope: project (ai-lock.json)

        Skills (0)
          none

        MCP servers (0)
          none

        Hooks (1)
          guard
            source:  <source>
            trusted: no (blocked from update)
            claude-code  present  .claude/settings.json
            cursor       missing  .cursor/hooks.json (file not found)

        Summary: 1 present, 1 missing, 0 different, 0 unknown"
      `)
    })
  },
)
