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
  return { ok: false, status: 404 }
}

it('only tries the specified ref, no fallback', async () => {
  const { fetchSkillFolderHash } = await import('../../../src/lock.ts')

  mockFetch.mockResolvedValueOnce(notOk())

  await fetchSkillFolderHash('owner/repo', 'skills/s/SKILL.md', null, 'develop')

  expect(mockFetch.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
    [
      "https://api.github.com/repos/owner/repo/git/trees/develop?recursive=1",
    ]
  `)
})
