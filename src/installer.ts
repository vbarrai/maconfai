import { existsSync } from 'fs';
import { mkdir, cp, readdir, rm, access, stat, lstat, readlink, symlink, realpath } from 'fs/promises';
import { join, basename, normalize, resolve, sep, relative, dirname } from 'path';
import { homedir, platform } from 'os';
import type { Skill, AgentType, McpServerConfig } from './types.ts';
import { agents } from './agents.ts';
import { parseSkillMd } from './skills.ts';
import { installMcpServers, uninstallMcpServers } from './mcp.ts';

const AGENTS_DIR = '.agents';
const SKILLS_SUBDIR = 'skills';

export function sanitizeName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '-')
    .replace(/^[.\-]+|[.\-]+$/g, '');
  return sanitized.substring(0, 255) || 'unnamed-skill';
}

function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath));
  const normalizedTarget = normalize(resolve(targetPath));
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}

function getCanonicalSkillsDir(global: boolean, cwd?: string): string {
  const baseDir = global ? homedir() : cwd || process.cwd();
  return join(baseDir, AGENTS_DIR, SKILLS_SUBDIR);
}

function getAgentSkillsDir(agentType: AgentType, global: boolean, cwd?: string): string {
  const agent = agents[agentType];
  if (global) return agent.globalSkillsDir;
  return join(cwd || process.cwd(), agent.skillsDir);
}

async function resolveParentSymlinks(path: string): Promise<string> {
  const resolved = resolve(path);
  const dir = dirname(resolved);
  const base = basename(resolved);
  try {
    const realDir = await realpath(dir);
    return join(realDir, base);
  } catch {
    return resolved;
  }
}

async function createSymlink(target: string, linkPath: string): Promise<boolean> {
  try {
    const resolvedTarget = resolve(target);
    const resolvedLinkPath = resolve(linkPath);

    const [realTarget, realLinkPath] = await Promise.all([
      realpath(resolvedTarget).catch(() => resolvedTarget),
      realpath(resolvedLinkPath).catch(() => resolvedLinkPath),
    ]);

    // Already the same location
    if (realTarget === realLinkPath) return true;

    const realTargetWithParents = await resolveParentSymlinks(target);
    const realLinkPathWithParents = await resolveParentSymlinks(linkPath);
    if (realTargetWithParents === realLinkPathWithParents) return true;

    // Clean up existing entry at linkPath
    try {
      const stats = await lstat(linkPath);
      if (stats.isSymbolicLink()) {
        const existingTarget = await readlink(linkPath);
        const resolvedExisting = resolve(dirname(linkPath), existingTarget);
        if (resolvedExisting === resolvedTarget) return true;
        await rm(linkPath);
      } else {
        await rm(linkPath, { recursive: true });
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ELOOP') {
        try { await rm(linkPath, { force: true }); } catch {}
      }
    }

    const linkDir = dirname(linkPath);
    await mkdir(linkDir, { recursive: true });

    const realLinkDir = await resolveParentSymlinks(linkDir);
    const relativePath = relative(realLinkDir, target);
    const symlinkType = platform() === 'win32' ? 'junction' : undefined;

    await symlink(relativePath, linkPath, symlinkType);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((e) => !e.name.startsWith('_') && e.name !== '.git' && e.name !== 'metadata.json')
      .map(async (entry) => {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
          await copyDirectory(srcPath, destPath);
        } else {
          await cp(srcPath, destPath, { dereference: true, recursive: true });
        }
      })
  );
}

export async function installSkill(
  skill: Skill,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string; mcpServers?: Record<string, McpServerConfig> } = {}
): Promise<{ success: boolean; path: string; error?: string; mcpInstalled?: string[]; mcpSkipped?: string[] }> {
  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const skillName = sanitizeName(skill.name || basename(skill.path));

  // Canonical location: .agents/skills/<skill-name>
  const canonicalBase = getCanonicalSkillsDir(isGlobal, cwd);
  const canonicalDir = join(canonicalBase, skillName);

  // Agent-specific location
  const agentBase = getAgentSkillsDir(agentType, isGlobal, cwd);
  const agentDir = join(agentBase, skillName);

  if (!isPathSafe(canonicalBase, canonicalDir) || !isPathSafe(agentBase, agentDir)) {
    return { success: false, path: agentDir, error: 'Path traversal detected' };
  }

  try {
    // 1-2. Copy skill files + symlink (only when SKILL.md exists)
    if (existsSync(join(skill.path, 'SKILL.md'))) {
      await rm(canonicalDir, { recursive: true, force: true }).catch(() => {});
      await mkdir(canonicalDir, { recursive: true });
      await copyDirectory(skill.path, canonicalDir);

      const realCanonical = await realpath(canonicalDir).catch(() => resolve(canonicalDir));
      const realAgent = await resolveParentSymlinks(agentDir);

      if (realCanonical !== realAgent) {
        const symlinkCreated = await createSymlink(canonicalDir, agentDir);

        if (!symlinkCreated) {
          await rm(agentDir, { recursive: true, force: true }).catch(() => {});
          await mkdir(agentDir, { recursive: true });
          await copyDirectory(skill.path, agentDir);
        }
      }
    }

    // 3. Install MCP servers if provided
    let mcpInstalled: string[] = []
    let mcpSkipped: string[] = []
    if (options.mcpServers && Object.keys(options.mcpServers).length > 0) {
      const mcpResult = await installMcpServers(options.mcpServers, agentType, { cwd: options.cwd })
      mcpInstalled = mcpResult.installed
      mcpSkipped = mcpResult.skipped
    }

    return { success: true, path: agentDir, mcpInstalled, mcpSkipped };
  } catch (error) {
    return {
      success: false,
      path: agentDir,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function uninstallSkill(
  skillName: string,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string; mcpServerNames?: string[] } = {}
): Promise<boolean> {
  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const sanitized = sanitizeName(skillName);

  // Remove agent symlink/dir
  const agentBase = getAgentSkillsDir(agentType, isGlobal, cwd);
  const agentDir = join(agentBase, sanitized);
  if (isPathSafe(agentBase, agentDir)) {
    await rm(agentDir, { recursive: true, force: true }).catch(() => {});
  }

  // Remove canonical dir
  const canonicalBase = getCanonicalSkillsDir(isGlobal, cwd);
  const canonicalDir = join(canonicalBase, sanitized);
  if (isPathSafe(canonicalBase, canonicalDir)) {
    await rm(canonicalDir, { recursive: true, force: true }).catch(() => {});
  }

  // Remove MCP servers if provided
  if (options.mcpServerNames && options.mcpServerNames.length > 0) {
    await uninstallMcpServers(options.mcpServerNames, agentType, { cwd });
  }

  return true;
}

export interface InstalledSkill {
  name: string;
  description: string;
  dirName: string;
  agents: AgentType[];
  scope: 'project' | 'global';
}

export async function listInstalledSkills(
  options: { global?: boolean; cwd?: string } = {}
): Promise<InstalledSkill[]> {
  const cwd = options.cwd || process.cwd();
  const isGlobal = options.global ?? false;
  const allAgents: AgentType[] = ['claude-code', 'cursor', 'codex'];
  const skillsMap = new Map<string, InstalledSkill>();

  // Scan canonical dir + each agent dir
  const dirsToScan: Array<{ dir: string; agentType?: AgentType }> = [
    { dir: getCanonicalSkillsDir(isGlobal, cwd) },
    ...allAgents.map((a) => ({ dir: getAgentSkillsDir(a, isGlobal, cwd), agentType: a })),
  ];

  for (const { dir, agentType } of dirsToScan) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

        const skillDir = join(dir, entry.name);
        const skillMdPath = join(skillDir, 'SKILL.md');
        let skill: Skill | null = null;

        try {
          await stat(skillMdPath);
          skill = await parseSkillMd(skillMdPath);
        } catch {
          // No SKILL.md — check for mcp.json (MCP-only skill)
          try {
            await stat(join(skillDir, 'mcp.json'));
            skill = { name: entry.name, description: '', path: skillDir };
          } catch {
            continue;
          }
        }

        if (!skill) continue;

        const key = skill.name;
        if (skillsMap.has(key)) {
          const existing = skillsMap.get(key)!;
          if (agentType && !existing.agents.includes(agentType)) {
            existing.agents.push(agentType);
          }
        } else {
          skillsMap.set(key, {
            name: skill.name,
            description: skill.description,
            dirName: entry.name,
            agents: agentType ? [agentType] : [],
            scope: isGlobal ? 'global' : 'project',
          });
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return Array.from(skillsMap.values());
}
