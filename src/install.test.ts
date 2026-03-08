import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { setupScenario, skillFile } from './test-utils.ts';
import { uninstallSkill, listInstalledSkills } from './installer.ts';

describe('install', () => {
  const { init, cleanup, givenSkill, when, then, thenExists, getTargetDir } = setupScenario();

  beforeEach(() => init());
  afterEach(() => cleanup());

  describe('basic installation', () => {
    it('installs a skill to claude', async () => {
      await givenSkill('my-skill');

      await when({ skills: ['my-skill'], agents: ['claude-code'] });

      await then({ './.claude/skills/my-skill/SKILL.md': skillFile('my-skill') });
    });

    it('installs multiple skills to multiple agents', async () => {
      await givenSkill('skill-a', 'skill-b');

      await when({ skills: ['skill-a', 'skill-b'], agents: ['claude-code', 'cursor'] });

      await then({
        './.claude/skills/skill-a/SKILL.md': skillFile('skill-a'),
        './.claude/skills/skill-b/SKILL.md': skillFile('skill-b'),
        './.cursor/skills/skill-a/SKILL.md': skillFile('skill-a'),
        './.cursor/skills/skill-b/SKILL.md': skillFile('skill-b'),
      });
    });

    it('installs a skill to all agents', async () => {
      await givenSkill('shared');

      await when({ skills: ['shared'], agents: ['claude-code', 'cursor', 'codex'] });

      await then({
        './.claude/skills/shared/SKILL.md': skillFile('shared'),
        './.cursor/skills/shared/SKILL.md': skillFile('shared'),
        './.codex/skills/shared/SKILL.md': skillFile('shared'),
      });
    });
  });

  describe('--skills filter', () => {
    it('only installs specified skills', async () => {
      await givenSkill('wanted', 'unwanted');

      await when({ skills: ['wanted'], agents: ['claude-code'] });

      expect(await thenExists('.claude/skills/wanted/SKILL.md')).toBe(true);
      expect(await thenExists('.claude/skills/unwanted/SKILL.md')).toBe(false);
    });

    it('auto-selects all skills when no --skills filter', async () => {
      await givenSkill('alpha', 'beta');

      await when({ agents: ['claude-code'] });

      const alphaContent = await readFile(
        join(getTargetDir(), '.claude/skills/alpha/SKILL.md'),
        'utf-8'
      );
      const betaContent = await readFile(
        join(getTargetDir(), '.claude/skills/beta/SKILL.md'),
        'utf-8'
      );

      expect(alphaContent).toContain('alpha');
      expect(betaContent).toContain('beta');
    });
  });

  describe('--agents filter', () => {
    it('only installs to specified agents', async () => {
      await givenSkill('targeted');

      await when({ agents: ['cursor'] });

      expect(await thenExists('.cursor/skills/targeted/SKILL.md')).toBe(true);
      expect(await thenExists('.claude/skills/targeted/SKILL.md')).toBe(false);
      expect(await thenExists('.codex/skills/targeted/SKILL.md')).toBe(false);
    });

    it('auto-selects all agents when no --agents filter', async () => {
      await givenSkill('everywhere');

      await when({});

      expect(await thenExists('.claude/skills/everywhere/SKILL.md')).toBe(true);
      expect(await thenExists('.cursor/skills/everywhere/SKILL.md')).toBe(true);
      expect(await thenExists('.codex/skills/everywhere/SKILL.md')).toBe(true);
    });
  });

  describe('-y / --yes flag', () => {
    it('--yes long form works the same as -y', async () => {
      await givenSkill('long-form');

      await when({ agents: ['claude-code'] });

      const content = await readFile(
        join(getTargetDir(), '.claude/skills/long-form/SKILL.md'),
        'utf-8'
      );
      expect(content).toContain('long form');
    });

    it('skips confirmation and installs without interaction', async () => {
      await givenSkill('no-confirm');

      const { stdout } = await when({ agents: ['claude-code'] });

      expect(await thenExists('.claude/skills/no-confirm/SKILL.md')).toBe(true);
      expect(stdout).toContain('Done');
    });

    it('installs all skills to all agents when no filters given', async () => {
      await givenSkill('skill-x', 'skill-y');

      await when({});

      for (const agent of ['.claude', '.cursor', '.codex']) {
        for (const skill of ['skill-x', 'skill-y']) {
          expect(await thenExists(`${agent}/skills/${skill}/SKILL.md`)).toBe(true);
        }
      }
    });
  });

  describe('uninstall skill', () => {
    it('removes a skill from an agent', async () => {
      await givenSkill('to-remove');
      await when({ skills: ['to-remove'], agents: ['claude-code'] });

      expect(await thenExists('.claude/skills/to-remove/SKILL.md')).toBe(true);

      await uninstallSkill('to-remove', 'claude-code', { global: false, cwd: getTargetDir() });

      expect(await thenExists('.claude/skills/to-remove/SKILL.md')).toBe(false);
    });

    it('removes the canonical directory', async () => {
      await givenSkill('canonical-check');
      await when({ skills: ['canonical-check'], agents: ['claude-code'] });

      expect(await thenExists('.agents/skills/canonical-check/SKILL.md')).toBe(true);

      await uninstallSkill('canonical-check', 'claude-code', { global: false, cwd: getTargetDir() });

      expect(await thenExists('.agents/skills/canonical-check')).toBe(false);
    });

    it('removes from one agent and also removes the canonical dir', async () => {
      await givenSkill('shared');
      await when({ skills: ['shared'], agents: ['claude-code', 'cursor'] });

      await uninstallSkill('shared', 'claude-code', { global: false, cwd: getTargetDir() });

      expect(await thenExists('.claude/skills/shared/SKILL.md')).toBe(false);
      // canonical dir is also removed, so cursor's symlink becomes dangling
      expect(await thenExists('.agents/skills/shared')).toBe(false);
    });

    it('does not error when uninstalling a non-existent skill', async () => {
      const result = await uninstallSkill('ghost', 'claude-code', { global: false, cwd: getTargetDir() });

      expect(result).toBe(true);
    });

    it('skill no longer appears in listInstalledSkills after uninstall', async () => {
      await givenSkill('listed');
      await when({ skills: ['listed'], agents: ['claude-code'] });

      const before = await listInstalledSkills({ global: false, cwd: getTargetDir() });
      expect(before.find((s) => s.name === 'listed')).toBeDefined();

      await uninstallSkill('listed', 'claude-code', { global: false, cwd: getTargetDir() });

      const after = await listInstalledSkills({ global: false, cwd: getTargetDir() });
      expect(after.find((s) => s.name === 'listed')).toBeUndefined();
    });
  });

  describe('uninstall agent', () => {
    it('removes a skill from claude-code only', async () => {
      await givenSkill('per-agent');
      await when({ skills: ['per-agent'], agents: ['claude-code', 'cursor', 'codex'] });

      await uninstallSkill('per-agent', 'claude-code', { global: false, cwd: getTargetDir() });

      expect(await thenExists('.claude/skills/per-agent')).toBe(false);
    });

    it('removes a skill from cursor only', async () => {
      await givenSkill('per-agent');
      await when({ skills: ['per-agent'], agents: ['claude-code', 'cursor', 'codex'] });

      await uninstallSkill('per-agent', 'cursor', { global: false, cwd: getTargetDir() });

      expect(await thenExists('.cursor/skills/per-agent')).toBe(false);
    });

    it('removes a skill from codex only', async () => {
      await givenSkill('per-agent');
      await when({ skills: ['per-agent'], agents: ['claude-code', 'cursor', 'codex'] });

      await uninstallSkill('per-agent', 'codex', { global: false, cwd: getTargetDir() });

      expect(await thenExists('.codex/skills/per-agent')).toBe(false);
    });

    it('removes all skills from a single agent', async () => {
      await givenSkill('skill-a', 'skill-b', 'skill-c');
      await when({ agents: ['claude-code', 'cursor'] });

      const opts = { global: false, cwd: getTargetDir() };
      await uninstallSkill('skill-a', 'claude-code', opts);
      await uninstallSkill('skill-b', 'claude-code', opts);
      await uninstallSkill('skill-c', 'claude-code', opts);

      expect(await thenExists('.claude/skills/skill-a')).toBe(false);
      expect(await thenExists('.claude/skills/skill-b')).toBe(false);
      expect(await thenExists('.claude/skills/skill-c')).toBe(false);
    });

    it('does not error when agent has no skills installed', async () => {
      const result = await uninstallSkill('nope', 'codex', { global: false, cwd: getTargetDir() });

      expect(result).toBe(true);
    });
  });
});
