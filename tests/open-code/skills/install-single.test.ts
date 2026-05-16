import { it, expect } from 'vitest'
import { describeConfai, skillFile } from '../../test-utils.ts'

describeConfai(
  'open-code / install single skill',
  ({ givenSkill, whenInstall, targetFile, targetHasFiles, targetHasNoFiles }) => {
    it('should install one skill to open-code with symlink to canonical dir', async () => {
      await givenSkill('my-skill')

      await whenInstall({ skills: ['my-skill'], agents: ['open-code'] })

      await targetHasFiles(
        '.agents/skills/my-skill/SKILL.md',
        '.opencode/skills/my-skill',
        'ai-lock.json',
      )

      await targetHasNoFiles(
        '.mcp.json',
        '.claude/skills/my-skill',
        '.cursor/skills/my-skill',
        '.codex/skills/my-skill',
      )

      expect(await targetFile('.agents/skills/my-skill/SKILL.md')).toMatchInlineSnapshot(`
        "---
        name: my-skill
        description: my skill
        ---
        my skill"
      `)
    })
  },
)
