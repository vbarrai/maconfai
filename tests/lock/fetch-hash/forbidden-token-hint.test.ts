import { it, expect, vi, afterEach } from 'vitest'
import { fetchSkillFolderHash } from '../../../src/lock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

// A 403 that is not a rate limit: a token not SSO-authorized for the org, or without access.
it('says the token cannot read the repository on a plain 403', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('', { status: 403, statusText: 'Forbidden' })),
  )

  await expect(
    fetchSkillFolderHash('owner/repo', 'skills/a', 'token', 'main'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: cannot read owner/repo from GitHub: HTTP 403 Forbidden — the token cannot read this repository (SSO authorization or repository permission)]`,
  )
})
