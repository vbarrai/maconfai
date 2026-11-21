import { describe, it, expect } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { detectProjectAgents } from '../src/agents.ts'

describe('detectProjectAgents', () => {
  it('detects Codex from .codex/hooks.json alone (hooks-only project)', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'maconfai-agents-'))

    try {
      await mkdir(join(cwd, '.codex'), { recursive: true })
      await writeFile(join(cwd, '.codex/hooks.json'), '{"hooks":{}}')

      expect(detectProjectAgents(cwd)).toEqual(['codex'])
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
