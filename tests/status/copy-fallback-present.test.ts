import { it, expect } from 'vitest'
import { cp, rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

// Where symlinks fail (e.g. Windows without symlink rights), installSkill copies the
// skill into the agent dir instead: that copy is what maconfai wrote, so it is present.
describeConfai(
  'status / copy fallback instead of a symlink',
  ({ givenSkill, whenInstall, getSourceDir, getTargetDir }) => {
    it('should report an identical copy of the canonical dir as present', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'] })

      const skillDir = join(getTargetDir(), '.claude/skills/alpha')
      await rm(skillDir)
      await cp(join(getTargetDir(), '.agents/skills/alpha'), skillDir, { recursive: true })

      expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(`
        "Scope: project (ai-lock.json)

        Skills (1)
          alpha
            source:  <source>
            trusted: no (blocked from update)
            claude-code  present  .claude/skills/alpha (copy of .agents/skills/alpha)

        MCP servers (0)
          none

        Hooks (0)
          none

        Summary: 1 present, 0 missing, 0 different, 0 unknown"
      `)
    })
  },
)
