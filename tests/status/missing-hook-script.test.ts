import { it, expect } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { guardFiles, hookGuard, statusOf } from './status-test-utils.ts'

describeConfai(
  'status / deleted hook companion script',
  ({ givenSource, whenInstall, getSourceDir, getTargetDir }) => {
    it('should report the hook as missing when the script its handlers run is gone', async () => {
      await givenSource({ hookDirs: hookGuard, hookDirFiles: guardFiles })
      await whenInstall({ agents: ['claude-code'] })

      await rm(join(getTargetDir(), '.agents/hooks/guard/guard.sh'))

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
            claude-code  missing  .claude/settings.json (script not found: .agents/hooks/guard/guard.sh)

        Summary: 0 present, 1 missing, 0 different, 0 unknown"
      `)
    })
  },
)
