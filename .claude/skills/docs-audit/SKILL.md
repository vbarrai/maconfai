---
name: docs-audit
version: 1.3.0
description: >-
  TRIGGER when the user asks to check, verify, audit, refresh, or update the agent documentation
  under `docs/agents-config/`, or wants to know whether upstream agent configuration has drifted
  from what maconfai documents. Use this whenever the user mentions "audit docs", "check agent
  docs", "are our docs up to date", "doc drift", or asks about new upstream features for Claude
  Code, Cursor, Codex, Gemini CLI, Amp Code, or Open Code that may not be reflected locally.
  DO NOT TRIGGER for code changes, test runs, or general questions about the maconfai codebase.
allowed-tools: WebFetch, WebSearch, Read, Glob, Grep, Edit, Write, Agent, Bash
disable-model-invocation: true
---

# Documentation Audit

Audit the internal agent documentation in `docs/agents-config/` against the official upstream sources, report drift, and — when drift is found — open a pull request from `main` with the proposed documentation updates and enable auto-merge so it lands on `main` automatically once CI passes.

## Why this skill exists

maconfai is only useful if its documentation reflects how the underlying agents actually work today. Upstream agents (Claude Code, Cursor, Codex, Gemini CLI, Amp Code, Open Code) ship features, rename fields, and change defaults frequently. Silent drift between `docs/agents-config/` and the official docs causes maconfai to install or describe configurations that no longer match reality. The audit catches that drift early.

## Inputs and ground truth

Two facts make this audit cheap to run correctly:

1. The set of agents and features is whatever exists on disk under `docs/agents-config/<agent>/<feature>.md`. Discover it with `ls` or `Glob` — do not hardcode a list in this skill, because it will drift.
2. Each local doc declares its own upstream source. The first non-banner lines of every doc contain:
   ```
   > **maconfai support: Supported | Not supported** — <short reason>
   > Official source: [<display>](<url>)
   ```
   Treat the `Official source:` URL inside each doc as authoritative. Do not maintain a parallel URL table — one source of truth.

If a doc is missing the `Official source:` line, that itself is a finding (report it and stop processing that file).

## Procedure

### Step 1 — Discover

Run `Glob` for `docs/agents-config/*/*.md` to enumerate the files to audit. For each file, read the first ~10 lines to capture:

- the maconfai support status (Supported / Not supported)
- the official source URL

### Step 2 — Parallelize per agent

Spawn one subagent per agent directory in a single message (Claude Code, Cursor, Codex, Gemini CLI, Amp Code, Open Code — whatever exists). Each subagent is responsible for all features of its agent. Doing this in one message means the fetches run concurrently and the audit finishes in roughly the time of the slowest single agent.

Give each subagent:
- the list of `<feature>.md` files for its agent
- the official URL extracted from each file
- the maconfai support status of each file
- a copy of "Step 3 — Compare" and "Step 4 — Findings" below, so it can return structured results

### Step 3 — Compare

For each `(agent, feature)` pair, fetch the official URL with `WebFetch`. If the page 404s, redirects to a different doc, or is gated, fall back to `WebSearch` with a query like `"<agent> <feature> documentation"` and prefer results on the official domain. Note the fallback in the finding so the human can verify.

Compare the local doc to the upstream page along these dimensions, prioritized roughly in this order (most impactful first):

1. **New or removed configuration fields** — JSON keys, TOML keys, frontmatter fields
2. **Changed file paths or scopes** — where the agent reads config from (user vs project vs managed)
3. **New transport types or CLI subcommands** — especially MCP transports and `<agent> mcp ...` commands
4. **Renamed fields** — same concept, different key name (high impact, easy to miss)
5. **Changed defaults** — values that shifted
6. **New hook event names or skill frontmatter fields**
7. **Env var / interpolation syntax changes** (e.g. `${VAR}` vs `${env:VAR}`)
8. **New configuration scopes** (managed, enterprise, team)

For each dimension, the question to answer is: "if a maconfai user trusted this local doc today, what would surprise them?" That framing is more useful than mechanically diffing text — upstream docs are often reorganized without semantic change, and you should not report cosmetic differences.

**Weight findings by maconfai support status.** Drift in a `Supported` feature directly affects installer behavior and is high priority. Drift in a `Not supported` feature is reference-only and is lower priority. Surface both, but label them.

### Step 4 — Findings

Each subagent returns findings in this shape:

```
## <Agent> / <Feature>
Status: Up to date | Needs update | New upstream feature | Cannot verify
Support: Supported | Not supported

Changes detected:
- <field/concept>: local says "<X>", upstream now says "<Y>"  (quote exact strings where possible)

Recommended action:
- <specific edit to docs/agents-config/<agent>/<feature>.md, naming the section or line if practical>

Notes:
- <fallback used, ambiguity, auth wall, etc. — empty if none>
```

If `Status` is `Up to date`, omit the `Changes detected` and `Recommended action` blocks.

## Final report

After all subagents return, produce a single report with this structure:

### 1. Executive summary

A table sorted by priority (Supported-and-changed first, then Supported-and-up-to-date, then Not-supported):

| Agent | Feature | Status | Support | Priority |
| :---- | :------ | :----- | :------ | :------- |

### 2. Detailed findings

The per-feature blocks from Step 4, grouped by agent.

### 3. Prioritized action list

A flat numbered list of recommended edits, ordered by impact. Each item names the file to edit and what to change. This is what the human will work from, so keep it concrete — "Add `transport: streamable-http` to the MCP transports list in `docs/agents-config/claude-code/mcp.md`" is useful; "Update Claude Code MCP doc" is not.

## Step 5 — Open a pull request when drift is found

If the report contains at least one `Needs update` or `New upstream feature` finding, open a pull request with the documentation changes. If every feature is `Up to date` (or only `Cannot verify` entries remain), skip this step and stop after presenting the report.

Procedure:

1. **Show the report first.** Present the executive summary and prioritized action list to the user before touching any files, so they know what the PR will contain.
2. **Branch from `main`.** Make sure the working tree is clean (`git status`), then `git fetch origin` and create a new branch from `origin/main`: `git checkout -b docs/audit-YYYY-MM-DD origin/main`. Use today's date. If a branch with that name exists, append `-2`, `-3`, etc.
3. **Apply edits.** Make exactly the edits described in the prioritized action list — nothing more. Preserve the `> **maconfai support: …**` and `> Official source: …` banners. If an upstream URL has changed, update the `Official source:` line too.
4. **Commit.** One commit, message `docs: audit agent configs against upstream (YYYY-MM-DD)`. List the affected files and a one-line summary of each change in the commit body.
5. **Push and open the PR** with `gh pr create --base main`. The PR body should embed the full report (executive summary + detailed findings + action list) so reviewers see the upstream evidence behind every edit. Title: `docs: refresh agent config docs (YYYY-MM-DD audit)`.
6. **Enable auto-merge** so the PR merges into `main` on its own once CI is green: `gh pr merge --auto --squash`. `main` is protected by required status checks (`test`, `typecheck`, `lint-and-format`) but no longer requires a human review, so a passing CI run is the only gate. If CI fails, the PR stays open for a human to inspect — auto-merge never merges a red PR.
7. **Return the PR URL** to the user**, noting that it will auto-merge when CI passes.

If any step fails (dirty working tree, push rejected, `gh` not authenticated, auto-merge not enabled on the repo), stop and surface the error — do not try to work around it. The audit report itself is still valuable even without the PR.

## Guardrails

- **Audit before editing.** Never modify `docs/agents-config/` until Steps 1–4 have produced a concrete report. The PR step is a follow-on, not the entry point.
- **Only edit what the report justifies.** Each edit in the PR must trace back to a specific finding with an upstream quote. No drive-by reformatting, no "while I'm here" cleanups — those make the PR hard to review and erode trust in the audit.
- **Quote, don't paraphrase.** When reporting a difference, include the exact field name or value from each side. Paraphrased findings are hard to verify and easy to dispute.
- **Say so when you don't know.** If a page is unreachable, ambiguous, or behind auth, label the status `Cannot verify` and explain in `Notes`. A confident wrong finding is worse than an honest gap.
- **Don't invent URLs.** The only URLs you should fetch are the ones extracted from local docs (Step 1) or returned by `WebSearch`. Do not guess URLs from agent names.
- **Ignore cosmetic drift.** Reorganized headings, rephrased prose, and changed example variable names are not findings. Semantic differences are.
