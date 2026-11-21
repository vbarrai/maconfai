import { it, expect } from 'vitest'
import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

describeConfai(
  'status / skill replaced by a hand-written directory',
  ({ givenSkill, whenInstall, getSourceDir, getTargetDir }) => {
    it('should report a hand-written directory instead of the symlink as different', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'] })

      const skillDir = join(getTargetDir(), '.claude/skills/alpha')
      await rm(skillDir)
      await mkdir(skillDir)
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\nname: alpha\ndescription: mine\n---\nhand-written',
      )

      expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(`
        "Scope: project (ai-lock.json)

        Skills (1)
          alpha
            source:  <source>
            trusted: no (blocked from update)
            claude-code  different  .claude/skills/alpha (real directory, differs from .agents/skills/alpha)

        MCP servers (0)
          none

        Hooks (0)
          none

        Summary: 0 present, 0 missing, 1 different, 0 unknown"
      `)
    })
  },
)
