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

it('returns null when the folder is not in the tree', async () => {
  const { fetchSkillFolderHash } = await import('../../../src/lock.ts')

  mockFetch.mockResolvedValueOnce(okTree([{ path: 'other/folder', type: 'tree', sha: 'x' }]))

  const result = await fetchSkillFolderHash(
    'owner/repo',
    'skills/missing/SKILL.md',
    'token',
    'main',
  )

  expect(result).toMatchInlineSnapshot(`null`)
})
