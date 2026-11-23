import { it, expect, vi, afterEach } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

afterEach(() => vi.restoreAllMocks())

describeConfai(
  'install / a hand-written skill of the same name is refused',
  ({ givenSkill, getTargetDir, whenInstall, targetFile, targetFiles }) => {
    it('should keep the hand-written skill, explain why and write nothing', async () => {
      await givenSkill('beta')
      const handWritten = join(getTargetDir(), '.claude/skills/beta')
      await mkdir(handWritten, { recursive: true })
      await writeFile(join(handWritten, 'SKILL.md'), 'hand-written')
      vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`exit ${code}`)
      })
      const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

      await expect(
        whenInstall({ skills: ['beta'], agents: ['claude-code'], mcps: [], hooks: [] }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: exit 1]`)

      const printed = stdout.mock.calls.map(([chunk]) => String(chunk)).join('')
      expect(printed).toContain('skill files that ai-lock.json does not record')
      expect(printed).toContain('beta: .claude/skills/beta')
      expect(printed).toContain('re-run with --force to replace them')

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".claude/skills/beta/SKILL.md",
        ]
      `)
      expect(await targetFile('.claude/skills/beta/SKILL.md')).toMatchInlineSnapshot(
        `"hand-written"`,
      )
    })
  },
)
