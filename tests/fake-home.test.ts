import { describe, it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir, tmpdir, userInfo } from 'os'
import { agents } from '../src/agents.ts'
import { listInstalledSkills } from '../src/installer.ts'

// tests/setup-fake-home.ts swaps HOME before any test module loads.
describe('test setup / fake home', () => {
  it('points every user-scope skills dir at a temp home, never the real one', async () => {
    const realHome = userInfo().homedir

    expect(homedir()).not.toBe(realHome)
    expect(homedir().startsWith(tmpdir())).toBe(true)

    const userDirs = Object.values(agents).map((a) => a.globalSkillsDir)

    expect(userDirs.map((dir) => dir.replace(homedir(), '~'))).toMatchInlineSnapshot(`
      [
        "~/.claude/skills",
        "~/.cursor/skills",
        "~/.agents/skills",
        "~/.config/opencode/skills",
      ]
    `)

    // The canonical user dir `~/.agents/skills` is also Codex's user dir: check it
    // through the installer, which is what scans the installed skills.
    const canary = join(homedir(), '.agents/skills/canary')
    await mkdir(canary, { recursive: true })
    await writeFile(join(canary, 'SKILL.md'), '---\nname: canary\ndescription: c\n---\n')

    expect(await listInstalledSkills({ global: true })).toMatchInlineSnapshot(`
      [
        {
          "agents": [
            "codex",
          ],
          "description": "c",
          "dirName": "canary",
          "name": "canary",
          "scope": "global",
        },
      ]
    `)
  })
})
