import type { HookGroup } from '../../src/types.ts'
import { statusText } from '../../src/status.ts'

// A hook whose handlers run a companion script copied to `.agents/hooks/guard/`.
export const hookGuard: Record<string, HookGroup> = {
  guard: {
    'claude-code': {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            { type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.agents/hooks/guard/guard.sh' },
          ],
        },
      ],
    },
    cursor: {
      preToolUse: [{ matcher: 'Shell', command: '.agents/hooks/guard/guard.sh' }],
    },
  },
}

export const guardFiles = { guard: { 'guard.sh': '#!/bin/sh\n' } }

// The formatted report, with the temp source path made stable for snapshots.
export async function statusOf(targetDir: string, sourceDir: string): Promise<string> {
  return (await statusText(targetDir)).replaceAll(sourceDir, '<source>')
}
