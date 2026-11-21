import { it, expect, vi } from 'vitest'
import { describeConfai } from '../test-utils.ts'

// $HOME is the target dir, where whenInstall runs the CLI.
const home = vi.hoisted(() => ({ dir: '' }))
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, homedir: () => home.dir || actual.homedir() }
})

describeConfai(
  'install / -y refused in the home directory',
  ({ givenSkill, whenInstall, getTargetDir, targetFiles }) => {
    it('exits without writing the user-level agent configs', async () => {
      await givenSkill('alpha')
      home.dir = getTargetDir()
      let output = ''
      const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        output += String(chunk)
        return true
      })
      const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`exit ${code}`)
      })

      try {
        await expect(whenInstall({ skills: ['alpha'] })).rejects.toThrow('exit 1')
      } finally {
        write.mockRestore()
        exit.mockRestore()
        home.dir = ''
      }

      expect(output.replace(/\x1B\[[0-9;]*m/g, '')).toContain(
        'You are in your home directory: project files written here are your user-level agent configs. Run maconfai from a project, or without -y to confirm.',
      )
      expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
    })
  },
)
