import { beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export function setupLockTest() {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lock-test-'))
    ;(globalThis as any).__TEST_HOME__ = tempDir
    vi.resetModules()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  async function givenLockFile(content: string) {
    await mkdir(join(tempDir, '.agents'), { recursive: true })
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), content)
  }

  async function thenLockFile(): Promise<string> {
    return readFile(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8')
  }

  return { givenLockFile, thenLockFile }
}
