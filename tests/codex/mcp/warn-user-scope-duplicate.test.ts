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
  'codex / warn on an MCP server also defined in ~/.codex/config.toml',
  ({ givenSource, whenInstall }) => {
    let home = ''

    beforeEach(async () => {
      home = await mkdtemp(join(tmpdir(), 'home-'))
      vi.stubEnv('HOME', home)
      vi.stubEnv('CODEX_HOME', '')
      warn.mockClear()
    })
    afterEach(async () => {
      vi.unstubAllEnvs()
      await rm(home, { recursive: true, force: true })
    })

    it('names bare and quoted server tables, not the others', async () => {
      await mkdir(join(home, '.codex'))
      await writeFile(
        join(home, '.codex', 'config.toml'),
        [
          'model = "gpt-5"',
          '[mcp_servers.github]',
          'url = "https://example.com/mcp"',
          '[mcp_servers."linear".env]',
          'TOKEN = "x"',
        ].join('\n'),
      )
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['github-mcp'] },
          linear: { command: 'npx', args: ['linear-mcp'] },
          slack: { command: 'npx', args: ['slack-mcp'] },
        },
      })

      await whenInstall({ mcps: ['github', 'linear', 'slack'], agents: ['codex'] })

      const messages = warn.mock.calls.map(([m]) => String(m).replace(home, '~'))
      expect(messages).toMatchInlineSnapshot(`
        [
          "MCP server "github" is also defined in your Codex user config (~/.codex/config.toml). The two definitions can conflict: keep one of them.",
          "MCP server "linear" is also defined in your Codex user config (~/.codex/config.toml). The two definitions can conflict: keep one of them.",
        ]
      `)
    })
  },
)
