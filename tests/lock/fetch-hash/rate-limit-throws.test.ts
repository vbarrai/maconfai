import { it, expect, vi, afterEach } from 'vitest'
import { fetchSkillFolderHash } from '../../../src/lock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('names the rate limit when GitHub refuses with no requests left', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response('', {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'x-ratelimit-remaining': '0' },
        }),
    ),
  )

  await expect(
    fetchSkillFolderHash('owner/repo', 'skills/a', null, 'main'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: cannot read owner/repo from GitHub: HTTP 403 Forbidden (rate limit exceeded) — set GITHUB_TOKEN or run gh auth login for a higher limit]`,
  )
})
