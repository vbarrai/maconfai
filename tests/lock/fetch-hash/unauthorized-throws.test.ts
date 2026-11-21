import { it, expect, vi, afterEach } from 'vitest'
import { fetchSkillFolderHash } from '../../../src/lock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('throws with the HTTP status when GitHub rejects the token', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('', { status: 401, statusText: 'Unauthorized' })),
  )

  await expect(
    fetchSkillFolderHash('owner/repo', 'skills/a/SKILL.md', 'invalid'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: cannot read owner/repo from GitHub: HTTP 401 Unauthorized — check GITHUB_TOKEN / GH_TOKEN]`,
  )
})
