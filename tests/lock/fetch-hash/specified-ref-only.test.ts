import { it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return { ...actual, homedir: () => '/tmp/fake-home-fetch-test' }
})

beforeEach(() => {
  vi.resetModules()
  mockFetch.mockReset()
})

function notOk() {
  return new Response('', { status: 404, statusText: 'Not Found' })
}

it('only tries the specified ref, no fallback', async () => {
  const { fetchSkillFolderHash } = await import('../../../src/lock.ts')

  mockFetch.mockResolvedValueOnce(notOk())

  // The ref does not exist: an error names it, and neither main nor master is tried
  await expect(
    fetchSkillFolderHash('owner/repo', 'skills/s/SKILL.md', null, 'develop'),
  ).rejects.toThrow('repository or ref (develop) not found')

  expect(mockFetch.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
    [
      "https://api.github.com/repos/owner/repo/git/trees/develop?recursive=1",
    ]
  `)
})
