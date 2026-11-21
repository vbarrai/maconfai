import { it, expect, vi, afterEach } from 'vitest'
import { mocks, getLogs } from './check-test-utils.ts'

// $HOME is the directory update runs from.
vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('os')>()),
  homedir: () => process.cwd(),
}))
vi.mock('@clack/prompts', () => ({ ...mocks, cancel: vi.fn() }))
const readLock = vi.fn(async () => ({ version: 1, skills: {}, mcpServers: {}, hooks: {} }))
vi.mock('../../src/lock.ts', () => ({ readLock, getGitHubToken: () => null }))

const isTTY = process.stdin.isTTY
afterEach(() => {
  Object.defineProperty(process.stdin, 'isTTY', { value: isTTY, configurable: true })
})

it('refuses to run in the home directory without a terminal', async () => {
  Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
  mocks.confirm.mockResolvedValueOnce(false)
  const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`exit ${code}`)
  })
  const { runCheck } = await import('../../src/check.ts')

  const result = await runCheck([], { autoUpdate: true }).then(
    () => 'completed',
    (e: Error) => e.message,
  )
  exit.mockRestore()

  expect({ result, lockRead: readLock.mock.calls.length > 0 }).toEqual({
    lockRead: false,
    result: 'exit 1',
  })
  expect(getLogs()).toBe(
    'error: You are in your home directory: project files written here are your user-level agent configs. Run maconfai update from a project, or from a terminal to confirm.',
  )
})
