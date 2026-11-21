import { it, expect, vi } from 'vitest'
import { mocks, getLogs } from '../check/check-test-utils.ts'
import { describeConfai } from '../test-utils.ts'
import { givenLock, whenTrust, whenUntrust, inDir, mixedTrustLock } from './trust-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)
// Real lock file on disk; only the remote hash lookup is faked, so an update is available
vi.mock('../../src/lock.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lock.ts')>()),
  getGitHubToken: () => null,
  fetchSkillFolderHash: async () => 'new-hash',
}))

describeConfai('untrust / update blocks again', ({ getTargetDir, targetFile }) => {
  it('trust then untrust leaves only trusted: false, and update blocks the skill', async () => {
    const lock = { ...mixedTrustLock, skills: { alpha: mixedTrustLock.skills.alpha } }
    await givenLock(getTargetDir(), { ...lock, mcpServers: {}, hooks: {} })

    await whenTrust(getTargetDir(), ['skill:alpha'])
    await whenUntrust(getTargetDir(), ['skill:alpha'])
    const { runCheck } = await import('../../src/check.ts')
    await inDir(getTargetDir(), () => runCheck([], { autoUpdate: true }))

    // Nothing else in the lock moved: alpha only gained trusted: false
    expect(JSON.parse(await targetFile('ai-lock.json')).skills).toEqual({
      alpha: { ...lock.skills.alpha, trusted: false },
    })
    expect(getLogs()).toMatchInlineSnapshot(`
      "success: Trusted 1 item(s)
      message:   - alpha
      success: Untrusted 1 item(s)
      message:   - alpha
      warn: 1 item(s) blocked (not trusted):
      message:   - alpha
      info: To keep them updating, run: maconfai trust alpha
      info: To update them once: maconfai update --include-untrusted"
    `)
  })
})
