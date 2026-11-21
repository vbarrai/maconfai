import * as p from '@clack/prompts'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import type { AgentType, McpServerConfig, McpEnvSyntax } from './types.ts'
import { agents } from './agents.ts'

interface McpConfigFile {
  mcpServers?: Record<string, McpServerConfig>
  [key: string]: unknown
}

interface OpenCodeMcpServer {
  type?: 'local' | 'remote'
  command?: string[]
  url?: string
  headers?: Record<string, string>
  environment?: Record<string, string>
  enabled?: boolean
}

interface OpenCodeConfigFile {
  mcp?: Record<string, OpenCodeMcpServer>
  [key: string]: unknown
}

// ── Codex TOML helpers ─────────────────────────────────────

function tomlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function tomlValue(value: unknown): string {
  if (typeof value === 'string') return `"${tomlEscape(value)}"`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`
  return String(value)
}

function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : `"${tomlEscape(key)}"`
}

function tomlInlineTable(obj: Record<string, string>): string {
  const entries = Object.entries(obj).map(([k, v]) => `${tomlKey(k)} = ${tomlValue(v)}`)
  return `{ ${entries.join(', ')} }`
}

// A value that is exactly `${VAR}`: the only shape Codex can read from the environment.
const WHOLE_ENV_VAR = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/
const BEARER_ENV_VAR = /^Bearer \$\{([A-Za-z_][A-Za-z0-9_]*)\}$/

// Codex reads env vars by name, never through `${...}` interpolation:
// - header `Authorization: Bearer ${VAR}` → `bearer_token_env_var = "VAR"` (Codex adds `Bearer `)
// - header `${VAR}`                       → `env_http_headers = { Header = "VAR" }` (raw value)
// - stdio env `KEY: ${KEY}`               → `env_vars = ["KEY"]` (forwarded from the parent env)
// Anything else (renamed variable, default value, text around the variable) has no Codex
// equivalent and is written verbatim.
function toCodexServer(name: string, server: McpServerConfig): string {
  const lines: string[] = [`[mcp_servers.${tomlKey(name)}]`]

  if (server.url) {
    lines.push(`url = ${tomlValue(server.url)}`)
    if (server.headers) {
      let bearerVar: string | undefined
      const staticHeaders: Record<string, string> = {}
      const envHeaders: Record<string, string> = {}
      for (const [key, val] of Object.entries(server.headers)) {
        const bearerMatch = val.match(BEARER_ENV_VAR)
        const envMatch = val.match(WHOLE_ENV_VAR)
        if (key.toLowerCase() === 'authorization' && bearerMatch && !bearerVar) {
          bearerVar = bearerMatch[1]
        } else if (envMatch) {
          envHeaders[key] = envMatch[1]!
        } else {
          staticHeaders[key] = val
        }
      }
      if (bearerVar) {
        lines.push(`bearer_token_env_var = ${tomlValue(bearerVar)}`)
      }
      if (Object.keys(staticHeaders).length > 0) {
        lines.push(`http_headers = ${tomlInlineTable(staticHeaders)}`)
      }
      if (Object.keys(envHeaders).length > 0) {
        lines.push(`env_http_headers = ${tomlInlineTable(envHeaders)}`)
      }
    }
  } else {
    if (server.command) lines.push(`command = ${tomlValue(server.command)}`)
    if (server.args?.length) lines.push(`args = ${tomlValue(server.args)}`)
    if (server.env) {
      const literalEnv: Record<string, string> = {}
      const forwardedVars: string[] = []
      for (const [key, val] of Object.entries(server.env)) {
        if (val.match(WHOLE_ENV_VAR)?.[1] === key) {
          forwardedVars.push(key)
        } else {
          literalEnv[key] = val
        }
      }
      if (Object.keys(literalEnv).length > 0) {
        lines.push(`env = ${tomlInlineTable(literalEnv)}`)
      }
      if (forwardedVars.length > 0) {
        lines.push(`env_vars = ${tomlValue(forwardedVars)}`)
      }
    }
  }

  return lines.join('\n')
}

// ── Codex config.toml document ─────────────────────────────
//
// `.codex/config.toml` holds much more than MCP servers (`model`, `[features]`,
// `[[skills.config]]`, `[projects."…"]`…). It is edited line by line, never parsed and
// re-serialized: every block maconfai does not own is written back byte for byte,
// comments included.

interface CodexBlock {
  // MCP server this block belongs to (`[mcp_servers.<name>]` and its sub-tables), else null
  server: string | null
  lines: string[]
}

const KEY_PART = String.raw`(?:[A-Za-z0-9_-]+|"(?:[^"\\]|\\.)*"|'[^']*')`
const TABLE_HEADER = new RegExp(
  String.raw`^\s*(\[\[?)\s*(${KEY_PART}(?:\s*\.\s*${KEY_PART})*)\s*\]\]?\s*(?:#.*)?$`,
)

function splitTomlKey(key: string): string[] {
  return (key.match(new RegExp(KEY_PART, 'g')) ?? []).map((part) => {
    if (part.startsWith('"')) return JSON.parse(part) as string
    if (part.startsWith("'")) return part.slice(1, -1)
    return part
  })
}

function parseHeader(line: string): { server: string | null } | null {
  const match = line.replace(/\r$/, '').match(TABLE_HEADER)
  if (!match) return null
  const isArrayTable = match[1] === '[['
  const parts = splitTomlKey(match[2]!)
  const isServer = !isArrayTable && parts[0] === 'mcp_servers' && parts.length >= 2
  return { server: isServer ? parts[1]! : null }
}

const isComment = (line: string) => line.trim().startsWith('#')
const isBlank = (line: string) => line.trim() === ''

// Returns the multiline-string delimiter (`"""` or `'''`) still open at the end of `line`, given
// the one open at its start. Comments, single-line strings and escapes are skipped, so a `"""`
// inside them does not open a string.
function openMultilineAfter(line: string, open: string | null): string | null {
  let i = 0
  while (i < line.length) {
    if (open) {
      if (open === '"""' && line[i] === '\\') {
        i += 2
      } else if (line.startsWith(open, i)) {
        // Up to two quotes of content may sit right before the closing delimiter (`a"""""`).
        let end = i + 3
        while (end < i + 5 && line[end] === open[0]) end++
        i = end
        open = null
      } else {
        i++
      }
      continue
    }
    const char = line[i]!
    if (char === '#') break
    if (line.startsWith('"""', i) || line.startsWith("'''", i)) {
      open = line.slice(i, i + 3)
      i += 3
    } else if (char === '"' || char === "'") {
      i++
      while (i < line.length && line[i] !== char) i += char === '"' && line[i] === '\\' ? 2 : 1
      i++
    } else {
      i++
    }
  }
  return open
}

function parseCodexToml(content: string): CodexBlock[] {
  const lines = content.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()

  const blocks: CodexBlock[] = [{ server: null, lines: [] }]
  let openDelimiter: string | null = null

  for (const line of lines) {
    const current = blocks[blocks.length - 1]!
    const header = openDelimiter ? null : parseHeader(line)
    openDelimiter = openMultilineAfter(line, openDelimiter)
    if (!header) {
      current.lines.push(line)
      continue
    }
    // Comments right above a header describe that table: they move with it.
    let commentStart = current.lines.length
    while (commentStart > 0 && isComment(current.lines[commentStart - 1]!)) commentStart--
    blocks.push({ server: header.server, lines: [...current.lines.splice(commentStart), line] })
  }

  return blocks
}

function codexServerNames(blocks: CodexBlock[]): Set<string> {
  return new Set(blocks.flatMap((block) => (block.server ? [block.server] : [])))
}

function trailingBlanks(lines: string[]): string[] {
  let start = lines.length
  while (start > 0 && isBlank(lines[start - 1]!)) start--
  return lines.slice(start)
}

function setCodexServer(blocks: CodexBlock[], name: string, serverLines: string[]): CodexBlock[] {
  const first = blocks.findIndex((block) => block.server === name)
  if (first !== -1) {
    // Keep the comments above the header and the blank lines after the server's last block.
    const firstLines = blocks[first]!.lines
    const comments = firstLines.slice(
      0,
      firstLines.findIndex((line) => parseHeader(line)),
    )
    const last = blocks.filter((block) => block.server === name).pop()!
    const replaced = {
      server: name,
      lines: [...comments, ...serverLines, ...trailingBlanks(last.lines)],
    }
    return blocks.flatMap((block, i) =>
      i === first ? [replaced] : block.server === name ? [] : [block],
    )
  }

  // A new server goes right after the last MCP server, or at the end of the file.
  let at = blocks.length
  while (at > 1 && blocks[at - 1]!.server === null) at--
  if (at === 1) at = blocks.length
  let before = blocks[at - 1]!.lines
  if (at === blocks.length) {
    // The file's own trailing blank lines stay at the end (serializeCodexToml writes them back).
    before = before.slice(0, before.length - trailingBlanks(before).length)
    blocks = [...blocks.slice(0, at - 1), { ...blocks[at - 1]!, lines: before }]
  }
  const lines = [...serverLines]
  if (before.length > 0 && !isBlank(before[before.length - 1]!)) lines.unshift('')
  if (at < blocks.length) lines.push('')
  return [...blocks.slice(0, at), { server: name, lines }, ...blocks.slice(at)]
}

// Comments above a removed server's header are the user's, not part of the table: keep them.
function removeCodexServers(blocks: CodexBlock[], names: Set<string>): CodexBlock[] {
  return blocks.flatMap((block) => {
    if (!block.server || !names.has(block.server)) return [block]
    const comments = block.lines.slice(
      0,
      block.lines.findIndex((line) => parseHeader(line)),
    )
    if (comments.length === 0) return []
    return [{ server: null, lines: [...comments, ...trailingBlanks(block.lines)] }]
  })
}

// `original` is the file as read: its trailing blank lines are written back unchanged.
function serializeCodexToml(blocks: CodexBlock[], original: string): string {
  const lines = blocks.flatMap((block) => block.lines)
  while (lines.length > 0 && isBlank(lines[lines.length - 1]!)) lines.pop()
  if (lines.length === 0) return ''
  const originalLines = original.split('\n')
  if (originalLines[originalLines.length - 1] === '') originalLines.pop()
  return [...lines, ...trailingBlanks(originalLines)].join('\n') + '\n'
}

async function readCodexToml(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

async function installMcpServersCodex(
  servers: Record<string, McpServerConfig>,
  configPath: string,
  syntax: McpEnvSyntax,
  ownedNames?: Set<string>,
): Promise<{ installed: string[]; skipped: string[] }> {
  const original = await readCodexToml(configPath)
  let blocks = parseCodexToml(original)
  const existing = codexServerNames(blocks)

  const installed: string[] = []
  const skipped: string[] = []

  for (const [name, serverConfig] of Object.entries(servers)) {
    if (existing.has(name) && !ownedNames?.has(name)) {
      skipped.push(name)
      continue
    }
    const translated = translateServerConfig(serverConfig, syntax)
    blocks = setCodexServer(blocks, name, toCodexServer(name, translated).split('\n'))
    installed.push(name)
  }

  if (installed.length > 0) {
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, serializeCodexToml(blocks, original), 'utf-8')
  }

  return { installed, skipped }
}

function toOpenCodeServer(server: McpServerConfig): OpenCodeMcpServer {
  if (server.url) {
    const result: OpenCodeMcpServer = { type: 'remote', url: server.url }
    if (server.headers) result.headers = server.headers
    return result
  }
  const result: OpenCodeMcpServer = { type: 'local' }
  const cmd: string[] = []
  if (server.command) cmd.push(server.command)
  if (server.args) cmd.push(...server.args)
  if (cmd.length > 0) result.command = cmd
  if (server.env) result.environment = server.env
  return result
}

// Variables Cursor resolves itself (https://cursor.com/docs/mcp.md, "Config interpolation").
// They are not environment variables, so they must not get the `env:` prefix.
const CURSOR_BUILTIN_VARIABLES = new Set([
  'workspaceFolder',
  'userHome',
  'workspaceFolderBasename',
  'pathSeparator',
  '/',
])

// env-prefix (Cursor): `${VAR}` → `${env:VAR}`, except `${env:VAR}` and Cursor's own variables,
// left as is. Cursor documents no default-value syntax, so `${VAR:-default}` becomes
// `${env:VAR}`, pushed to `droppedDefaults`. Only the variable is reported: the default may be
// a secret.
export function translateEnvVar(
  value: string,
  syntax: McpEnvSyntax,
  droppedDefaults?: string[],
): string {
  if (syntax === 'bare') return value
  if (syntax === 'opencode-env') {
    // Open Code uses {env:VAR} (no leading $). Convert ${VAR} → {env:VAR}, skip pre-converted {env:...}.
    return value.replace(/\$\{([^}]+)\}/g, '{env:$1}')
  }
  return value.replace(/\$\{(?!env:)([^}]+)\}/g, (match, inner: string) => {
    if (CURSOR_BUILTIN_VARIABLES.has(inner)) return match
    const fallbackAt = inner.indexOf(':-')
    if (fallbackAt === -1) return `\${env:${inner}}`
    const translated = `\${env:${inner.slice(0, fallbackAt)}}`
    droppedDefaults?.push(translated)
    return translated
  })
}

function translateStringFields(
  obj: Record<string, unknown>,
  syntax: McpEnvSyntax,
  droppedDefaults?: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = translateEnvVar(value, syntax, droppedDefaults)
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) =>
        typeof v === 'string' ? translateEnvVar(v, syntax, droppedDefaults) : v,
      )
    } else if (value && typeof value === 'object') {
      result[key] = translateStringFields(value as Record<string, unknown>, syntax, droppedDefaults)
    } else {
      result[key] = value
    }
  }
  return result
}

export function translateServerConfig(
  server: McpServerConfig,
  syntax: McpEnvSyntax,
  droppedDefaults?: string[],
): McpServerConfig {
  if (syntax === 'bare') return server
  return translateStringFields(
    server as unknown as Record<string, unknown>,
    syntax,
    droppedDefaults,
  ) as unknown as McpServerConfig
}

async function readMcpConfig(filePath: string): Promise<McpConfigFile> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as McpConfigFile
  } catch {
    return {}
  }
}

async function writeMcpConfig(filePath: string, config: McpConfigFile): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}

export async function installMcpServers(
  servers: Record<string, McpServerConfig>,
  agentType: AgentType,
  options: { cwd?: string; ownedNames?: Set<string> } = {},
): Promise<{ installed: string[]; skipped: string[] }> {
  const agent = agents[agentType]
  if (!agent.mcpConfigPath || !agent.mcpEnvSyntax) {
    return { installed: [], skipped: Object.keys(servers) }
  }

  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, agent.mcpConfigPath)

  if (agent.mcpConfigFormat === 'opencode') {
    return installMcpServersOpenCode(servers, configPath, agent.mcpEnvSyntax, options.ownedNames)
  }

  if (agent.mcpConfigFormat === 'codex') {
    return installMcpServersCodex(servers, configPath, agent.mcpEnvSyntax, options.ownedNames)
  }

  const config = await readMcpConfig(configPath)

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  const installed: string[] = []
  const skipped: string[] = []

  for (const [name, serverConfig] of Object.entries(servers)) {
    if (config.mcpServers[name] && !options.ownedNames?.has(name)) {
      skipped.push(name)
      continue
    }
    const droppedDefaults: string[] = []
    config.mcpServers[name] = translateServerConfig(
      serverConfig,
      agent.mcpEnvSyntax,
      droppedDefaults,
    )
    if (droppedDefaults.length > 0) {
      p.log.warn(
        `MCP server ${name}: ${agent.displayName} has no default-value syntax, default dropped for ${droppedDefaults.join(', ')}`,
      )
    }
    installed.push(name)
  }

  if (installed.length > 0) {
    await writeMcpConfig(configPath, config)
  }

  return { installed, skipped }
}

async function installMcpServersOpenCode(
  servers: Record<string, McpServerConfig>,
  configPath: string,
  syntax: McpEnvSyntax,
  ownedNames?: Set<string>,
): Promise<{ installed: string[]; skipped: string[] }> {
  let config: OpenCodeConfigFile = {}
  try {
    const content = await readFile(configPath, 'utf-8')
    config = JSON.parse(content) as OpenCodeConfigFile
  } catch {}

  if (!config.mcp) {
    config.mcp = {}
  }

  const installed: string[] = []
  const skipped: string[] = []

  for (const [name, serverConfig] of Object.entries(servers)) {
    if (config.mcp[name] && !ownedNames?.has(name)) {
      skipped.push(name)
      continue
    }
    const translated = translateServerConfig(serverConfig, syntax)
    config.mcp[name] = toOpenCodeServer(translated)
    installed.push(name)
  }

  if (installed.length > 0) {
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }

  return { installed, skipped }
}

export async function listInstalledMcpServerNames(
  options: { cwd?: string } = {},
): Promise<Set<string>> {
  const cwd = options.cwd || process.cwd()
  const names = new Set<string>()

  for (const agent of Object.values(agents)) {
    if (!agent.mcpConfigPath) continue
    const filePath = join(cwd, agent.mcpConfigPath)

    if (agent.mcpConfigFormat === 'opencode') {
      try {
        const content = await readFile(filePath, 'utf-8')
        const config = JSON.parse(content) as OpenCodeConfigFile
        if (config.mcp) {
          for (const name of Object.keys(config.mcp)) {
            names.add(name)
          }
        }
      } catch {}
    } else if (agent.mcpConfigFormat === 'codex') {
      try {
        const content = await readFile(filePath, 'utf-8')
        for (const name of codexServerNames(parseCodexToml(content))) {
          names.add(name)
        }
      } catch {}
    } else {
      const config = await readMcpConfig(filePath)
      if (config.mcpServers) {
        for (const name of Object.keys(config.mcpServers)) {
          names.add(name)
        }
      }
    }
  }

  return names
}

export async function uninstallMcpServers(
  serverNames: string[],
  agentType: AgentType,
  options: { cwd?: string } = {},
): Promise<void> {
  const agent = agents[agentType]
  if (!agent.mcpConfigPath) return

  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, agent.mcpConfigPath)

  if (agent.mcpConfigFormat === 'opencode') {
    let config: OpenCodeConfigFile = {}
    try {
      const content = await readFile(configPath, 'utf-8')
      config = JSON.parse(content) as OpenCodeConfigFile
    } catch {
      return
    }
    if (!config.mcp) return
    for (const name of serverNames) {
      delete config.mcp[name]
    }
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    return
  }

  if (agent.mcpConfigFormat === 'codex') {
    const content = await readCodexToml(configPath)
    if (!content) return
    const blocks = parseCodexToml(content)
    const names = new Set(serverNames)
    if (blocks.some((block) => block.server && names.has(block.server))) {
      const kept = removeCodexServers(blocks, names)
      await writeFile(configPath, serializeCodexToml(kept, content), 'utf-8')
    }
    return
  }

  const config = await readMcpConfig(configPath)

  if (!config.mcpServers) return

  for (const name of serverNames) {
    delete config.mcpServers[name]
  }

  await writeMcpConfig(configPath, config)
}
