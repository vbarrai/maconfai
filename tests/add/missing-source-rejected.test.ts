import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'
import { runAdd } from '../../src/add-remove.ts'

describeConfai('add / a local source that does not exist', ({ targetFiles }) => {
  it('should throw (one line on stderr from the CLI) instead of exiting from inside install', async () => {
    await expect(
      runAdd('skill', ['/nonexistent/source', 'alpha', '--agents=claude-code']),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Path not found: /nonexistent/source]`)

    expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
  })
})
