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

it('returns null on network error', async () => {
  const { fetchSkillFolderHash } = await import('../../../src/lock.ts')

  mockFetch.mockRejectedValue(new Error('Network error'))

  const result = await fetchSkillFolderHash('owner/repo', 'skills/s/SKILL.md', 'token', 'main')

  expect(result).toMatchInlineSnapshot(`null`)
})
