import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import matter from 'gray-matter';
import type { Skill } from './types.ts';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__']);

async function hasSkillMd(dir: string): Promise<boolean> {
  try {
    const s = await stat(join(dir, 'SKILL.md'));
    return s.isFile();
  } catch {
    return false;
  }
}

export async function parseSkillMd(skillMdPath: string): Promise<Skill | null> {
  try {
    const content = await readFile(skillMdPath, 'utf-8');
    const { data } = matter(content);

    if (typeof data.name !== 'string' || typeof data.description !== 'string') {
      return null;
    }

    return {
      name: data.name,
      description: data.description,
      path: dirname(skillMdPath),
      rawContent: content,
    };
  } catch {
    return null;
  }
}

/**
 * Discovers skills only in the ./skills directory of a repository.
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
      if (await hasSkillMd(skillDir)) {
        const skill = await parseSkillMd(join(skillDir, 'SKILL.md'));
        if (skill) skills.push(skill);
      }
    }
  } catch {
    // skills/ directory doesn't exist
  }

  // Also check if basePath itself has a SKILL.md (single skill repo)
  if (skills.length === 0 && (await hasSkillMd(basePath))) {
    const skill = await parseSkillMd(join(basePath, 'SKILL.md'));
    if (skill) skills.push(skill);
  }

  return skills;
}
