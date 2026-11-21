import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describeConfai } from '../../test-utils.ts'

const warn = vi.hoisted(() => vi.fn())
vi.mock('@clack/prompts', async (importOriginal) => {
  const original = (await importOriginal()) as { log: Record<string, unknown> }
  return { ...original, log: { ...original.log, warn } }
})

describeConfai(
  'open-code / warn on an MCP server also defined in ~/.config/opencode/opencode.json',
  ({ givenSource, whenInstall }) => {
    let home = ''

    beforeEach(async () => {
      home = await mkdtemp(join(tmpdir(), 'home-'))
      vi.stubEnv('HOME', home)
      warn.mockClear()
    })
    afterEach(async () => {
      vi.unstubAllEnvs()
      await rm(home, { recursive: true, force: true })
    })

    it('names the server defined in both scopes, not the others', async () => {
      await mkdir(join(home, '.config', 'opencode'), { recursive: true })
      await writeFile(
        join(home, '.config', 'opencode', 'opencode.json'),
        JSON.stringify({ mcp: { github: { type: 'local', command: ['gh-mcp'] } } }),
      )
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['github-mcp'] },
          slack: { command: 'npx', args: ['slack-mcp'] },
        },
      })

      await whenInstall({ mcps: ['github', 'slack'], agents: ['open-code'] })

      const messages = warn.mock.calls.map(([m]) => String(m).replace(home, '~'))
      expect(messages).toMatchInlineSnapshot(`
        [
          "MCP server "github" is also defined in your Open Code user config (~/.config/opencode/opencode.json). The two definitions can conflict: keep one of them.",
        ]
      `)
    })
  },
)
