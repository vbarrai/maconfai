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

it('returns root SHA when skill path is just SKILL.md (empty folder path)', async () => {
  const { fetchSkillFolderHash } = await import('../../../src/lock.ts')

  mockFetch.mockResolvedValueOnce(okTree([{ path: 'some/entry', type: 'tree', sha: 'irrelevant' }]))

  const result = await fetchSkillFolderHash('owner/repo', 'SKILL.md', 'token', 'main')

  expect(result).toMatchInlineSnapshot(`"root-sha"`)
})
