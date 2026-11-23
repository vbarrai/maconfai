import { it, expect, vi, afterEach } from 'vitest'
import { fetchSkillFolderHash } from '../../../src/lock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('throws when the network is down instead of returning null', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('fetch failed')
    }),
  )

  await expect(
    fetchSkillFolderHash('owner/repo', 'skills/a'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: cannot read owner/repo from GitHub: network error: fetch failed]`,
  )
})
