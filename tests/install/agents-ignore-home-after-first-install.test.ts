import { it, expect, vi, afterEach } from 'vitest'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

// A fake $HOME, so the result never depends on the machine running the tests.
const fakeHome = vi.hoisted(() => {
  delete process.env.CLAUDE_CONFIG_DIR
  delete process.env.CODEX_HOME
  return `${(process.env.TMPDIR ?? '/tmp').replace(/\/+$/, '')}/maconfai-fake-home-${process.pid}-after-first`
})
vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('os')>()),
  homedir: () => fakeHome,
}))

afterEach(() => rm(fakeHome, { recursive: true, force: true }))

describeConfai(
  'install / agents of a set-up project ignore $HOME',
  ({ givenSkillWithMcp, whenInstall, targetFiles, targetFile }) => {
    it('keeps the same agents when ~/.cursor appears on the machine', async () => {
      await mkdir(join(fakeHome, '.claude'), { recursive: true })
      await givenSkillWithMcp('alpha', { m1: { url: 'https://m1.example/mcp' } })

      await whenInstall({ skills: ['alpha'], mcps: ['m1'], hooks: [] })
      await mkdir(join(fakeHome, '.cursor'))
      await whenInstall({ skills: ['alpha'], mcps: ['m1'], hooks: [] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          ".mcp.json",
          "ai-lock.json",
        ]
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect({
        alpha: lock.skills.alpha.agents,
        m1: lock.mcpServers.m1.agents,
      }).toMatchInlineSnapshot(`
        {
          "alpha": [
            "claude-code",
          ],
          "m1": [
            "claude-code",
          ],
        }
      `)
    })
  },
)
