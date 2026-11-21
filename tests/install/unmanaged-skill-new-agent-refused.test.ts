import { it, expect, vi, afterEach } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

afterEach(() => vi.restoreAllMocks())

describeConfai(
  'install / adding an agent to a managed skill keeps its hand-written copy there',
  ({ givenSkill, getTargetDir, whenInstall, targetFile }) => {
    it('should refuse to replace the hand-written copy in the new agent dir', async () => {
      await givenSkill('beta')
      await whenInstall({ skills: ['beta'], agents: ['claude-code'], mcps: [], hooks: [] })
      const handWritten = join(getTargetDir(), '.cursor/skills/beta')
      await mkdir(handWritten, { recursive: true })
      await writeFile(join(handWritten, 'SKILL.md'), 'hand-written')
      vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`exit ${code}`)
      })
      const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

      await expect(
        whenInstall({ skills: ['beta'], agents: ['claude-code', 'cursor'], mcps: [], hooks: [] }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: exit 1]`)

      const printed = stdout.mock.calls.map(([chunk]) => String(chunk)).join('')
      expect(printed).toContain('beta: .cursor/skills/beta')
      expect(await targetFile('.cursor/skills/beta/SKILL.md')).toMatchInlineSnapshot(
        `"hand-written"`,
      )
      expect(JSON.parse(await targetFile('ai-lock.json')).skills.beta.agents)
        .toMatchInlineSnapshot(`
        [
          "claude-code",
        ]
      `)
    })
  },
)
