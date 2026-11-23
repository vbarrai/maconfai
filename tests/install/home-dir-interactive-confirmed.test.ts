import { it, expect, vi } from 'vitest'
import { runInstall } from '../../src/install.ts'
import { describeConfai } from '../test-utils.ts'

// $HOME is the target dir, where the CLI runs.
const home = vi.hoisted(() => ({ dir: '' }))
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, homedir: () => home.dir || actual.homedir() }
})

// The home-dir question is answered yes; any later confirmation (trust, proceed) yes.
const asked: string[] = []
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@clack/prompts')>()),
  confirm: async (opts: { message: string }) => {
    // Colors depend on the terminal (CI forces them): keep the plain text.
    asked.push(opts.message.replace(/\x1B\[[0-9;]*m/g, ''))
    return asked.length === 1 ? true : true
  },
}))

describeConfai(
  'install / interactive in the home directory, confirmed',
  ({ givenSkill, getSourceDir, getTargetDir, targetFiles }) => {
    it('installs when the user answers yes', async () => {
      await givenSkill('alpha')
      home.dir = getTargetDir()
      const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`exit ${code}`)
      })
      const originalCwd = process.cwd()
      let result = 'completed'

      try {
        process.chdir(getTargetDir())
        await runInstall([
          getSourceDir(),
          '--skills=alpha',
          '--agents=claude-code',
          '--mcps=',
          '--hooks=',
        ]).catch((e: Error) => (result = e.message))
      } finally {
        process.chdir(originalCwd)
        exit.mockRestore()
        home.dir = ''
      }

      expect({ result, asked }).toMatchInlineSnapshot(`
        {
          "asked": [
            "Run here anyway?",
            "Trust these configs? (maconfai update will fetch the latest blindly)",
            "Proceed?",
          ],
          "result": "completed",
        }
      `)
      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          "ai-lock.json",
        ]
      `)
    })
  },
)
