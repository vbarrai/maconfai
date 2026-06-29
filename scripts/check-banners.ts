#!/usr/bin/env node
//
// check-banners.ts — fail if a doc's "maconfai support" banner disagrees with the code.
//
// The docs-audit skill (.claude/skills/docs-audit) compares docs/agents-config/<agent>/<feature>.md
// against the *upstream vendor* docs, but it treats the local "maconfai support: …" banner as
// trusted input and never checks it against maconfai's own implementation. That blind spot let two
// MCP banners read "Not supported" while the feature was fully wired and tested. This script closes
// it: it derives the expected support status from src/agents.ts (the single source of truth for what
// each agent can do) and asserts every banner matches.
//
// It runs in two places, mirroring version-check.sh:
//   1. CI (.github/workflows/ci.yml)
//   2. Locally, via `pnpm check:banners`
//
// Exit codes:
//   0 — every banner matches the code
//   1 — at least one banner is wrong or missing
//
// Output uses GitHub's ::error::/::warning:: annotation syntax, which is harmless when run locally.

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { agents } from '../src/agents.ts'

const DOCS_ROOT = fileURLToPath(new URL('../docs/agents-config', import.meta.url))

// Features maconfai never manages by design — instruction files, sub-agents, and Cursor rules are
// reference-only regardless of which agent they belong to.
const REFERENCE_ONLY = new Set(['context', 'sub-agents', 'rules'])

// Derive the support status the banner *should* declare, from the agent definitions in agents.ts.
// Returns true (Supported), false (Not supported), or null when the feature is unknown and the
// expectation cannot be derived (reported as a warning, not a failure).
function expectedSupport(agentDir: string, feature: string): boolean | null {
  if (REFERENCE_ONLY.has(feature)) return false
  const agent = (agents as Record<string, (typeof agents)[keyof typeof agents] | undefined>)[
    agentDir
  ]
  if (!agent) return false // agent not implemented in maconfai (e.g. gemini-cli, amp-code)
  switch (feature) {
    case 'skills':
      return Boolean(agent.skillsDir)
    case 'mcp':
      return Boolean(agent.mcpConfigPath && agent.mcpEnvSyntax)
    case 'hooks':
      return Boolean(agent.hooksConfigPath && agent.hooksConfigFormat)
    default:
      return null
  }
}

// Pull the declared status out of the banner. "Not supported" is matched before "Supported" so the
// substring does not shadow it. Scans the first few lines so a leading blank line cannot hide it.
function parseBanner(content: string): 'Supported' | 'Not supported' | null {
  const head = content.split('\n').slice(0, 5).join('\n')
  const match = head.match(/maconfai support:\s*(Not supported|Supported)/)
  return (match?.[1] as 'Supported' | 'Not supported') ?? null
}

const errors: string[] = []
const warnings: string[] = []

const agentDirs = readdirSync(DOCS_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

for (const agentDir of agentDirs) {
  const dir = join(DOCS_ROOT, agentDir)
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
  for (const file of files) {
    const feature = file.replace(/\.md$/, '')
    const rel = `docs/agents-config/${agentDir}/${file}`
    const declared = parseBanner(readFileSync(join(dir, file), 'utf8'))

    if (declared === null) {
      errors.push(`${rel}: missing or unparseable "maconfai support:" banner`)
      continue
    }

    const expected = expectedSupport(agentDir, feature)
    if (expected === null) {
      warnings.push(`${rel}: unknown feature "${feature}" — cannot verify banner against code`)
      continue
    }

    const expectedLabel = expected ? 'Supported' : 'Not supported'
    if (declared !== expectedLabel) {
      errors.push(
        `${rel}: banner says "${declared}" but the code says "${expectedLabel}" ` +
          `(derived from src/agents.ts for ${agentDir}/${feature})`,
      )
    }
  }
}

for (const w of warnings) {
  console.log(`::warning::${w}`)
}

if (errors.length > 0) {
  for (const e of errors) {
    console.log(`::error::${e}`)
  }
  console.error(
    `\n${errors.length} banner(s) disagree with the code. Fix the banner or the implementation.`,
  )
  process.exit(1)
}

console.log(`All ${agentDirs.length} agent doc directories have banners consistent with the code.`)
