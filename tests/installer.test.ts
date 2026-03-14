import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile, lstat, readlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { installSkill, uninstallSkill, listInstalledSkills } from '../src/installer.ts';
import type { Skill } from '../src/types.ts';

async function createSkillFixture(baseDir: string, name: string, description: string): Promise<Skill> {
  const skillDir = join(baseDir, name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${description}\n`
  );
  return { name, description, path: skillDir };
}

describe('installSkill', () => {
  let tempDir: string;
  let fixtureDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'maconfai-test-'));
    fixtureDir = join(tempDir, 'fixtures');
    await mkdir(fixtureDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('copies skill to canonical dir and symlinks to agent dir', async () => {
    const skill = await createSkillFixture(fixtureDir, 'my-skill', 'A test skill');

    const result = await installSkill(skill, 'claude-code', { global: false, cwd: tempDir });

    expect(result.success).toBe(true);

    // Canonical dir should have the SKILL.md
    const canonicalPath = join(tempDir, '.agents', 'skills', 'my-skill', 'SKILL.md');
    const content = await readFile(canonicalPath, 'utf-8');
    expect(content).toContain('my-skill');

    // Agent dir should be a symlink
    const agentPath = join(tempDir, '.claude', 'skills', 'my-skill');
    const stats = await lstat(agentPath);
    expect(stats.isSymbolicLink()).toBe(true);

    // Symlink should resolve to canonical
    const linkTarget = await readlink(agentPath);
    expect(linkTarget).toContain('.agents/skills/my-skill');

    // Agent dir should also have the SKILL.md (via symlink)
    const agentContent = await readFile(join(agentPath, 'SKILL.md'), 'utf-8');
    expect(agentContent).toContain('my-skill');
  });

  it('installs to multiple agents with symlinks to same canonical', async () => {
    const skill = await createSkillFixture(fixtureDir, 'shared-skill', 'Shared');

    const r1 = await installSkill(skill, 'claude-code', { global: false, cwd: tempDir });
    const r2 = await installSkill(skill, 'cursor', { global: false, cwd: tempDir });
    const r3 = await installSkill(skill, 'codex', { global: false, cwd: tempDir });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);

    // All agent dirs should be symlinks
    for (const agentDir of ['.claude/skills', '.cursor/skills', '.codex/skills']) {
      const agentPath = join(tempDir, agentDir, 'shared-skill');
      const stats = await lstat(agentPath);
      expect(stats.isSymbolicLink()).toBe(true);
    }
  });

  it('uninstalls skill from agent and canonical', async () => {
    const skill = await createSkillFixture(fixtureDir, 'to-remove', 'Will be removed');

    await installSkill(skill, 'claude-code', { global: false, cwd: tempDir });
    await uninstallSkill('to-remove', 'claude-code', { global: false, cwd: tempDir });

    // Both should be gone
    const canonicalPath = join(tempDir, '.agents', 'skills', 'to-remove');
    const agentPath = join(tempDir, '.claude', 'skills', 'to-remove');

    await expect(lstat(canonicalPath)).rejects.toThrow();
    await expect(lstat(agentPath)).rejects.toThrow();
  });

  it('lists installed skills including symlinks', async () => {
    const skill = await createSkillFixture(fixtureDir, 'listed-skill', 'Should be listed');

    await installSkill(skill, 'claude-code', { global: false, cwd: tempDir });

    const skills = await listInstalledSkills({ global: false, cwd: tempDir });
    const found = skills.find((s) => s.name === 'listed-skill');

    expect(found).toBeDefined();
    expect(found!.description).toBe('Should be listed');
  });

  it('reinstall overwrites existing skill', async () => {
    const skill = await createSkillFixture(fixtureDir, 'update-me', 'Version 1');
    await installSkill(skill, 'claude-code', { global: false, cwd: tempDir });

    // Update the fixture
    await writeFile(
      join(skill.path, 'SKILL.md'),
      '---\nname: update-me\ndescription: Version 2\n---\n\n# update-me\n\nVersion 2\n'
    );

    await installSkill(skill, 'claude-code', { global: false, cwd: tempDir });

    const canonicalPath = join(tempDir, '.agents', 'skills', 'update-me', 'SKILL.md');
    const content = await readFile(canonicalPath, 'utf-8');
    expect(content).toContain('Version 2');
  });
});
