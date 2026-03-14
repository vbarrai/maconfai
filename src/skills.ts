import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import matter from 'gray-matter';
import type { Skill, McpServerConfig } from './types.ts';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__']);

async function hasFile(dir: string, filename: string): Promise<boolean> {
  try {
    const s = await stat(join(dir, filename));
    return s.isFile();
  } catch {
    return false;
  }
}

async function parseMcpJson(skillDir: string): Promise<Record<string, McpServerConfig> | undefined> {
  try {
    const content = await readFile(join(skillDir, 'mcp.json'), 'utf-8');
    const parsed = JSON.parse(content) as { mcpServers?: Record<string, McpServerConfig> };
    if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
      return parsed.mcpServers;
    }
  } catch {
    // No mcp.json or invalid — that's fine
  }
  return undefined;
}

export async function parseSkillMd(skillMdPath: string): Promise<Skill | null> {
  try {
    const content = await readFile(skillMdPath, 'utf-8');
    const { data } = matter(content);

    if (typeof data.name !== 'string' || typeof data.description !== 'string') {
      return null;
    }

    const skillDir = dirname(skillMdPath);
    const mcpServers = await parseMcpJson(skillDir);

    return {
      name: data.name,
      description: data.description,
      path: skillDir,
      rawContent: content,
      mcpServers,
    };
  } catch {
    return null;
  }
}

/**
 * Discovers skills in the ./skills directory of a repository.
 * Each subdirectory of ./skills that contains a SKILL.md is a skill.
 */
export async function discoverSkills(basePath: string): Promise<Skill[]> {
  const skillsDir = join(basePath, 'skills');
  const skills: Skill[] = [];

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;

      const skillDir = join(skillsDir, entry.name);
      if (await hasFile(skillDir, 'SKILL.md')) {
        const skill = await parseSkillMd(join(skillDir, 'SKILL.md'));
        if (skill) skills.push(skill);
      }
    }
  } catch {
    // skills/ directory doesn't exist
  }

  // Also check if basePath itself has a SKILL.md (single skill repo)
  if (skills.length === 0 && (await hasFile(basePath, 'SKILL.md'))) {
    const skill = await parseSkillMd(join(basePath, 'SKILL.md'));
    if (skill) skills.push(skill);
  }

  return skills;
}

/**
 * Discovers MCP servers from a root-level mcp.json in the repository.
 * Separate from skills — MCP configs live at the repo root, not inside skill directories.
 */
export async function discoverMcpServers(basePath: string): Promise<Record<string, McpServerConfig>> {
  return await parseMcpJson(basePath) ?? {};
}
