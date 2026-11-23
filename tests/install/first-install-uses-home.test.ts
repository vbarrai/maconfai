import { it, expect, vi, afterEach } from 'vitest'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

// A fake $HOME, so the result never depends on the machine running the tests.
const fakeHome = vi.hoisted(() => {
  delete process.env.CLAUDE_CONFIG_DIR
  delete process.env.CODEX_HOME
  return `${(process.env.TMPDIR ?? '/tmp').replace(/\/+$/, '')}/maconfai-fake-home-${process.pid}-first`
})
vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('os')>()),
  homedir: () => fakeHome,
}))

afterEach(() => rm(fakeHome, { recursive: true, force: true }))

describeConfai(
  'install / a first install targets the agents found in $HOME',
  ({ givenSkill, whenInstall, targetFiles, targetFile }) => {
    it('installs for each agent whose home dir exists', async () => {
      await mkdir(join(fakeHome, '.claude'), { recursive: true })
      await mkdir(join(fakeHome, '.cursor'), { recursive: true })
      await givenSkill('alpha')

      await whenInstall({ skills: ['alpha'], mcps: [], hooks: [] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          ".cursor/skills/alpha",
          "ai-lock.json",
        ]
      `)
      expect(JSON.parse(await targetFile('ai-lock.json')).skills.alpha.agents)
        .toMatchInlineSnapshot(`
        [
          "claude-code",
          "cursor",
        ]
      `)
    })
  },
)
