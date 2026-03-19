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

it('should create a stdio MCP server in root mcp.json', async () => {
  promptResponses = [
    'mcp', // select: config type
    'my-server', // text: name
    'stdio', // select: transport
    'npx', // text: command
    '-y mcp-remote https://example.com', // text: args
    false, // confirm: env vars
    'root', // select: location
  ]

  const { runCreate } = await import('../../src/create.ts')
  await runCreate()

  const content = await readFile(join(tempDir, 'mcp.json'), 'utf-8')
  expect(content).toMatchInlineSnapshot(`
    "{
      "mcpServers": {
        "my-server": {
          "command": "npx",
          "args": [
            "-y",
            "mcp-remote",
            "https://example.com"
          ]
        }
      }
    }
    "
  `)
})
