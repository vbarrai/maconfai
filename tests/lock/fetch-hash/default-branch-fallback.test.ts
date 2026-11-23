import { it, expect, vi, afterEach } from 'vitest'
import { fetchSkillFolderHash } from '../../../src/lock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

// A source whose default branch is neither main nor master (develop, trunk…), recorded without
// a ref: its hash is read from HEAD instead of failing the check.
it('reads the default branch through HEAD when neither main nor master exists', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ sha: 'root', tree: [{ path: 'skills/a', type: 'tree', sha: 'a-sha' }] }),
      ),
    )
  vi.stubGlobal('fetch', fetchMock)

  await expect(fetchSkillFolderHash('owner/repo', 'skills/a/SKILL.md')).resolves.toBe('a-sha')
  expect(fetchMock.mock.calls.map(([url]) => url)).toMatchInlineSnapshot(`
    [
      "https://api.github.com/repos/owner/repo/git/trees/main?recursive=1",
      "https://api.github.com/repos/owner/repo/git/trees/master?recursive=1",
      "https://api.github.com/repos/owner/repo/git/trees/HEAD?recursive=1",
    ]
  `)
})
