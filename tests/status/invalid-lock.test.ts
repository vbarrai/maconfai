import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

// A lock file left with merge conflict markers must not look like an empty project.
describeConfai('status / invalid ai-lock.json', ({ getSourceDir, getTargetDir }) => {
  it('should say the lock is invalid instead of reporting nothing installed', async () => {
    await writeFile(
      join(getTargetDir(), 'ai-lock.json'),
      '{\n<<<<<<< HEAD\n  "version": 1,\n=======\n  "version": 2,\n>>>>>>> main\n}\n',
    )

    expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(
      `"ai-lock.json is not a readable, valid lock file (unreadable, invalid JSON, merge conflict markers, or no "version"/"skills"): fix it before trusting maconfai here."`,
    )
  })
})
