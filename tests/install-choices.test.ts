import { it, expect, vi, beforeEach } from 'vitest'
import { describeConfai } from './test-utils.ts'

const clean = (s: string) =>
  s
    .replace(/\x1B\[\??[0-9;]*[a-zA-Z]/g, '')
    .replace(/[^\S\n]+$/gm, '')
    .replace(/\/[^\s]*maconfai-e2e-[^\s/]+\/source/g, '<source>')

function renderMultiselect(opts: any): string {
  const lines = [`◆  ${clean(opts.message)}`]
  for (const o of opts.options) {
    const checked = (opts.initialValues ?? []).includes(o.value)
    const mark = checked ? '◼' : '◻'
    const hint = o.hint ? `  (${clean(o.hint)})` : ''
    lines.push(`│  ${mark} ${clean(o.label)}${hint}`)
  }
  lines.push('└')
  return lines.join('\n')
}

const mockMultiselect = vi.fn(async (opts: any) => {
  process.stdout.write('\n' + renderMultiselect(opts) + '\n')
  return opts.options.map((o: any) => o.value)
})

const mockConfirm = vi.fn(async (opts: any) => {
  process.stdout.write(`\n◆  ${clean(opts.message)} … Yes\n`)
  return true
})

vi.mock('@clack/prompts', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  return {
    ...original,
    multiselect: (opts: any) => mockMultiselect(opts),
    confirm: (opts: any) => mockConfirm(opts),
  }
})

function captureStdout() {
  let output = ''
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((...args: any[]) => {
    if (typeof args[0] === 'string') output += args[0]
    else if (Buffer.isBuffer(args[0])) output += args[0].toString()
    return true
  })
  return {
    stop: () => {
      spy.mockRestore()
      return clean(output)
    },
  }
}

describeConfai('install / choices shown to user', ({ givenSource, getTargetDir }) => {
  beforeEach(() => {
    mockMultiselect.mockClear()
    mockConfirm.mockClear()
  })

  it('shows the full interactive flow with skill choices', async () => {
    const { runInstall } = await import('../src/install.ts')

    await givenSource({
      skills: [
        { name: 'lint-fix', mcpServers: { eslint: { command: 'npx', args: ['eslint-mcp'] } } },
        { name: 'test-runner' },
        { name: 'deploy-helper' },
      ],
      mcps: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
        },
        postgres: {
          command: 'npx',
          args: ['@modelcontextprotocol/server-postgres'],
        },
      },
      hooks: {
        'pre-commit-lint': {
          description: 'Run linter before commit',
          'claude-code': {
            PreToolUse: [
              { matcher: 'Bash', hooks: [{ type: 'command', command: 'npm run lint' }] },
            ],
          },
        },
        'auto-test': {
          description: 'Run tests after file changes',
          'claude-code': {
            PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'npm test' }] }],
          },
        },
      },
    })

    const capture = captureStdout()
    const originalCwd = process.cwd()
    try {
      process.chdir(getTargetDir())
      await runInstall([getTargetDir().replace(/\/target$/, '/source'), '--agents=claude-code'])
    } finally {
      process.chdir(originalCwd)
    }
    const stdout = capture.stop()

    expect(stdout).toMatchInlineSnapshot(`
        "┌   maconfai install
        │
        ◇  Source: <source>
        │
        ◇  Found 3 skill(s) + 2 MCP server(s) + 2 hook(s)

        ◆  Select skills (space to toggle, uncheck to remove)
        │  ◻ deploy-helper  (deploy helper)
        │  ◻ lint-fix  (lint fix)
        │  ◻ test-runner  (test runner)
        └

        ◆  Select MCP servers to install (space to toggle)
        │  ◻ eslint (from: lint-fix)
        │  ◻ github (from: mcp.json)
        │  ◻ postgres (from: mcp.json)
        └

        ◆  Select hooks to install (space to toggle)
        │  ◻ pre-commit-lint (from: hooks.json) — Run linter before commit
        │  ◻ auto-test (from: hooks.json) — Run tests after file changes
        └
        │
        ●  Install: deploy-helper, lint-fix, test-runner
        │
        ●  MCP servers: eslint, github, postgres
        │
        ●  Hooks: pre-commit-lint, auto-test
        │
        ●  Agents: Claude Code

        ◆  Proceed? … Yes
        │
        ◇  Done
        │
        ◆  Installed 3 skill(s)
        │
        ◇  Installed 2 MCP server(s)
        │
        ◇  Installed 2 hook(s)
        │
        └  Done!

        "
      `)
  })
})
