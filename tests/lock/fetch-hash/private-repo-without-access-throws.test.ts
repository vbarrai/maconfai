import { it, expect, vi, afterEach } from 'vitest'
import { fetchSkillFolderHash } from '../../../src/lock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

// GitHub answers 404 for a private repo the token cannot see, on every branch tried.
it('throws when no branch could be read at all', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('', { status: 404, statusText: 'Not Found' })),
  )

  await expect(
    fetchSkillFolderHash('owner/private', 'skills/a'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: cannot read owner/private from GitHub: HTTP 404 Not Found — repository or ref (default branch) not found, or private without access (set GITHUB_TOKEN or run gh auth login)]`,
  )
})
