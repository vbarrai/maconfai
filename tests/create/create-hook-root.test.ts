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

it('should create a hook with multiple agents in root hooks.json', async () => {
  promptResponses = [
    'hook', // select: config type
    'auto-lint', // text: name
    'Lint on save', // text: description
    ['claude-code', 'cursor'], // multiselect: agents
    ['PostToolUse'], // multiselect: claude-code events
    'npm run lint', // text: command
    '', // text: matcher (empty = all)
    ['onSave'], // multiselect: cursor events
    'npm run lint', // text: command
    'root', // select: location
  ]

  const { runCreate } = await import('../../src/create.ts')
  await runCreate()

  const content = await readFile(join(tempDir, 'hooks.json'), 'utf-8')
  expect(content).toMatchInlineSnapshot(`
    "{
      "hooks": {
        "auto-lint": {
          "description": "Lint on save",
          "claude-code": {
            "PostToolUse": [
              {
                "command": "npm run lint"
              }
            ]
          },
          "cursor": {
            "onSave": [
              {
                "command": "npm run lint"
              }
            ]
          }
        }
      }
    }
    "
  `)
})
