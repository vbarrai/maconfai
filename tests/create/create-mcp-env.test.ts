import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let promptResponses: unknown[] = []
let promptIndex = 0

vi.mock('@clack/prompts', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  const respond = () => promptResponses[promptIndex++]
  return {
    ...original,
    intro: vi.fn(),
    outro: vi.fn(),
    log: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    select: vi.fn(async () => respond()),
    text: vi.fn(async () => respond()),
    multiselect: vi.fn(async () => respond()),
    confirm: vi.fn(async () => respond()),
  }
})

let tempDir: string
let originalCwd: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'maconfai-create-'))
  originalCwd = process.cwd()
  process.chdir(tempDir)
  promptIndex = 0
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
})

it('should create an MCP server with env vars', async () => {
  promptResponses = [
    'mcp', // select: config type
    'github', // text: name
    'stdio', // select: transport
    'npx', // text: command
    '-y @modelcontextprotocol/server-github', // text: args
    true, // confirm: env vars
    'GITHUB_TOKEN', // text: env name
    '${GITHUB_TOKEN}', // text: env value
    false, // confirm: another env var
    'root', // select: location
  ]

  const { runCreate } = await import('../../src/create.ts')
  await runCreate()

  const content = await readFile(join(tempDir, 'mcp.json'), 'utf-8')
  expect(content).toMatchInlineSnapshot(`
    "{
      "mcpServers": {
        "github": {
          "command": "npx",
          "args": [
            "-y",
            "@modelcontextprotocol/server-github"
          ],
          "env": {
            "GITHUB_TOKEN": "\${GITHUB_TOKEN}"
          }
        }
      }
    }
    "
  `)
})
