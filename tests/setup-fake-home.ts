import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { homedir, tmpdir, userInfo } from 'os'
import { afterAll } from 'vitest'

// Every test file gets its own empty HOME. User-scope paths (`~/.claude/skills`,
// `~/.agents/skills`, `~/.cursor/skills`, `~/.config/opencode/skills`) are computed
// from `os.homedir()` when `src/agents.ts` loads, and the agents to target on a first
// install are detected there: without this, a test could read or change the real
// config of whoever runs the suite. Setup files run before the test file's imports,
// so the modules under test only ever see the fake home.
const fakeHome = mkdtempSync(join(tmpdir(), 'maconfai-test-home-'))
process.env.HOME = fakeHome
process.env.USERPROFILE = fakeHome
// These override the home-based defaults in `src/agents.ts`.
delete process.env.CLAUDE_CONFIG_DIR
delete process.env.CODEX_HOME
let realHome: string | undefined
try {
  realHome = userInfo().homedir
} catch {
  // No passwd entry for this UID (some containers): nothing to compare against.
}
if (homedir() !== fakeHome || homedir() === realHome) {
  throw new Error(`HOME override did not apply: os.homedir() is still ${homedir()}`)
}

afterAll(() => rmSync(fakeHome, { recursive: true, force: true }))
