import { describe, it, beforeEach, afterEach } from 'vitest';
import { setupScenario } from './test-utils.ts';

describe('install e2e', () => {
  const { init, cleanup, given, when, then } = setupScenario();

  beforeEach(() => init());
  afterEach(() => cleanup());

  it('installs a skill to claude', async () => {
    await given({
      './skills/my-skill/SKILL.md': '---\nname: my-skill\ndescription: foo\n---\nfoo',
    });

    await when({
      skills: ['my-skill'],
      agents: ['claude-code'],
    });

    await then({
      './.claude/skills/my-skill/SKILL.md': '---\nname: my-skill\ndescription: foo\n---\nfoo',
    });
  });

  it('installs multiple skills to multiple agents', async () => {
    await given({
      './skills/skill-a/SKILL.md': '---\nname: skill-a\ndescription: A\n---\nA content',
      './skills/skill-b/SKILL.md': '---\nname: skill-b\ndescription: B\n---\nB content',
    });

    await when({
      skills: ['skill-a', 'skill-b'],
      agents: ['claude-code', 'cursor'],
    });

    await then({
      './.claude/skills/skill-a/SKILL.md': '---\nname: skill-a\ndescription: A\n---\nA content',
      './.claude/skills/skill-b/SKILL.md': '---\nname: skill-b\ndescription: B\n---\nB content',
      './.cursor/skills/skill-a/SKILL.md': '---\nname: skill-a\ndescription: A\n---\nA content',
      './.cursor/skills/skill-b/SKILL.md': '---\nname: skill-b\ndescription: B\n---\nB content',
    });
  });

  it('installs a skill to all agents', async () => {
    await given({
      './skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
    });

    await when({
      skills: ['shared'],
      agents: ['claude-code', 'cursor', 'codex'],
    });

    await then({
      './.claude/skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
      './.cursor/skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
      './.codex/skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
    });
  });
});
