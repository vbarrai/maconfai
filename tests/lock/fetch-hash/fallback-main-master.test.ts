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

function okTree(tree: Array<{ path: string; type: string; sha: string }>) {
  return { ok: true, json: async () => ({ sha: 'root-sha', tree }) }
}
function notOk() {
  return { ok: false, status: 404 }
}

it('falls back from main to master when no ref is specified', async () => {
  const { fetchSkillFolderHash } = await import('../../../src/lock.ts')

  mockFetch
    .mockResolvedValueOnce(notOk())
    .mockResolvedValueOnce(okTree([{ path: 'skills/s', type: 'tree', sha: 'master-sha' }]))

  const result = await fetchSkillFolderHash('owner/repo', 'skills/s/SKILL.md')

  expect(result).toMatchInlineSnapshot(`"master-sha"`)
  expect(mockFetch.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
    [
      "https://api.github.com/repos/owner/repo/git/trees/main?recursive=1",
      "https://api.github.com/repos/owner/repo/git/trees/master?recursive=1",
    ]
  `)
})
