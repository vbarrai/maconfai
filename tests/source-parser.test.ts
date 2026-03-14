import { describe, it, expect } from 'vitest'
import { parseSource, getOwnerRepo } from '../src/source-parser.ts'

describe('parseSource', () => {
  describe('local paths', () => {
    it('resolves relative paths', () => {
      const result = parseSource('./my-skills')
      expect(result.type).toBe('local')
      expect(result.localPath).toContain('my-skills')
    })

    it('resolves absolute paths', () => {
      const result = parseSource('/tmp/my-skills')
      expect(result.type).toBe('local')
      expect(result.localPath).toBe('/tmp/my-skills')
    })
  })

  describe('GitHub shorthand', () => {
    it('parses owner/repo', () => {
      const result = parseSource('owner/repo')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.ref).toBeUndefined()
    })

    it('parses owner/repo with subpath', () => {
      const result = parseSource('owner/repo/sub/path')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.subpath).toBe('sub/path')
    })
  })

  describe('branch support', () => {
    it('parses owner/repo#branch', () => {
      const result = parseSource('owner/repo#develop')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.ref).toBe('develop')
    })

    it('parses owner/repo#feature/my-branch', () => {
      const result = parseSource('owner/repo#feature/my-branch')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.ref).toBe('feature/my-branch')
    })

    it('ignores empty fragment', () => {
      const result = parseSource('owner/repo#')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.ref).toBeUndefined()
    })

    it('parses GitHub tree URL with branch', () => {
      const result = parseSource('https://github.com/owner/repo/tree/develop')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.ref).toBe('develop')
    })

    it('parses GitHub tree URL with branch and path', () => {
      const result = parseSource('https://github.com/owner/repo/tree/develop/skills')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.ref).toBe('develop')
      expect(result.subpath).toBe('skills')
    })

    it('does not extract # from full URLs', () => {
      const result = parseSource('https://github.com/owner/repo')
      expect(result.type).toBe('github')
      expect(result.url).toBe('https://github.com/owner/repo.git')
      expect(result.ref).toBeUndefined()
    })
  })
})

describe('getOwnerRepo', () => {
  it('extracts owner/repo from parsed github source', () => {
    const parsed = parseSource('owner/repo')
    expect(getOwnerRepo(parsed)).toBe('owner/repo')
  })

  it('extracts owner/repo from parsed github source with branch', () => {
    const parsed = parseSource('owner/repo#develop')
    expect(getOwnerRepo(parsed)).toBe('owner/repo')
  })

  it('returns null for local paths', () => {
    const parsed = parseSource('./local')
    expect(getOwnerRepo(parsed)).toBeNull()
  })
})
