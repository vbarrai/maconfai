import { it, expect, vi, afterEach } from 'vitest'
import { fetchSkillFolderHash, type TreeFetch } from '../../../src/lock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

// update checks every entry of a source: with a shared cache the repository tree is read once,
// not once per entry (60 requests an hour without a token).
it('reads one repository tree once for several entries', async () => {
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          sha: 'root',
          tree: [
            { path: 'skills/a', type: 'tree', sha: 'a-sha' },
            { path: 'mcps/m', type: 'tree', sha: 'm-sha' },
          ],
        }),
      ),
  )
  vi.stubGlobal('fetch', fetchMock)
  const cache = new Map<string, Promise<TreeFetch>>()

  const hashes = await Promise.all([
    fetchSkillFolderHash('owner/repo', 'skills/a', null, 'main', cache),
    fetchSkillFolderHash('owner/repo', 'mcps/m', null, 'main', cache),
  ])

  expect(hashes).toEqual(['a-sha', 'm-sha'])
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
