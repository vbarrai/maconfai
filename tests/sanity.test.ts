import { describe, it, expect } from 'vitest';
import { sanitizeName } from '../src/installer.ts';

describe('sanity', () => {
  it('sanitizes skill names', () => {
    expect(sanitizeName('My Cool Skill')).toBe('my-cool-skill');
    expect(sanitizeName('../../../etc/passwd')).toBe('etc-passwd');
    expect(sanitizeName('')).toBe('unnamed-skill');
  });
});
