import { it, expect } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

describeConfai(
  'status / deleted skill symlink',
  ({ givenSkill, whenInstall, getSourceDir, getTargetDir }) => {
    it('should report the agent whose symlink was deleted as missing', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code', 'cursor'] })

      await rm(join(getTargetDir(), '.cursor/skills/alpha'))

      expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(`
        "Scope: project (ai-lock.json)

        Skills (1)
          alpha
            source:  <source>
            trusted: no (blocked from update)
            claude-code  present  .claude/skills/alpha
            cursor       missing  .cursor/skills/alpha

        MCP servers (0)
          none

        Hooks (0)
          none

        Summary: 1 present, 1 missing, 0 different, 0 unknown"
      `)
    })
  },
)
