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

it('omits Authorization header when no token is provided', async () => {
  const { fetchSkillFolderHash } = await import('../../../src/lock.ts')

  mockFetch.mockResolvedValueOnce(okTree([]))

  await fetchSkillFolderHash('owner/repo', 'SKILL.md', null, 'main')

  expect(mockFetch.mock.calls[0][1].headers).toMatchInlineSnapshot(`
    {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "maconfai",
    }
  `)
})
