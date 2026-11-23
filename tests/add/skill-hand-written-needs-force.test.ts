import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'add skill / a hand-written skill of the same name',
  ({ givenSkill, getTargetDir, whenAdd, targetFile }) => {
    it('should refuse it, then replace it with --force', async () => {
      await givenSkill('beta')
      const handWritten = join(getTargetDir(), '.claude/skills/beta')
      await mkdir(handWritten, { recursive: true })
      await writeFile(join(handWritten, 'SKILL.md'), 'hand-written')

      await expect(whenAdd('skill', ['beta'], ['--agents=claude-code'])).rejects.toThrow(
        'Refusing to overwrite skill files that ai-lock.json does not record',
      )
      expect(await targetFile('.claude/skills/beta/SKILL.md')).toBe('hand-written')

      await whenAdd('skill', ['beta'], ['--agents=claude-code', '--force'])

      expect(await targetFile('.claude/skills/beta/SKILL.md')).toMatchInlineSnapshot(`
        "---
        name: beta
        description: beta
        ---
        beta"
      `)
      expect(Object.keys(JSON.parse(await targetFile('ai-lock.json')).skills))
        .toMatchInlineSnapshot(`
        [
          "beta",
        ]
      `)
    })
  },
)
