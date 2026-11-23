import { it, expect } from 'vitest'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { guardFiles, hookGuard, statusOf } from './status-test-utils.ts'

// A config that exists but cannot be read (EISDIR, EACCES…) is not a missing file.
describeConfai(
  'status / unreadable hooks config',
  ({ givenSource, whenInstall, getSourceDir, getTargetDir }) => {
    it('should report an unreadable config as unknown, not missing', async () => {
      await givenSource({ hookDirs: hookGuard, hookDirFiles: guardFiles })
      await whenInstall({ agents: ['claude-code'] })

      const settings = join(getTargetDir(), '.claude/settings.json')
      await rm(settings)
      await mkdir(settings)

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
            claude-code  unknown  .claude/settings.json (unreadable: EISDIR)

        Summary: 0 present, 0 missing, 0 different, 1 unknown"
      `)
    })
  },
)
