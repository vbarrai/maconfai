import { isAbsolute, resolve } from 'path'

interface ParsedSource {
  type: 'github' | 'local'
  url: string
  subpath?: string
  localPath?: string
  ref?: string
}

function isLocalPath(input: string): boolean {
  return (
    isAbsolute(input) ||
    input.startsWith('./') ||
    input.startsWith('../') ||
    input === '.' ||
    input === '..'
  )
}

/**
 * Extract a #branch suffix from the input string.
 * Returns [cleanInput, ref] — ref is undefined if no # found.
 */
function extractBranchFragment(input: string): [string, string | undefined] {
  // Only apply to non-URL inputs (shorthand like owner/repo#branch)
  if (input.includes('://')) return [input, undefined]
  const hashIdx = input.indexOf('#')
  if (hashIdx === -1) return [input, undefined]
  const ref = input.slice(hashIdx + 1)
  return [input.slice(0, hashIdx), ref || undefined]
}

/**
 * Parse a source string. Supports:
 * - Local paths: ./path, ../path, /absolute
 * - GitHub shorthand: owner/repo
 * - GitHub shorthand with branch: owner/repo#branch
 * - GitHub URLs: https://github.com/owner/repo
 * - GitHub tree URLs: https://github.com/owner/repo/tree/branch/path
 */
export function parseSource(input: string): ParsedSource {
  if (isLocalPath(input)) {
    return { type: 'local', url: resolve(input), localPath: resolve(input) }
  }

  // GitHub URL with path: https://github.com/owner/repo/tree/branch/path
  const treeWithPath = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/)
  if (treeWithPath) {
    const [, owner, repo, ref, subpath] = treeWithPath
    return { type: 'github', url: `https://github.com/${owner}/${repo}.git`, ref, subpath }
  }

  // GitHub URL with branch: https://github.com/owner/repo/tree/branch
  const treeBranch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/)
  if (treeBranch) {
    const [, owner, repo, ref] = treeBranch
    return { type: 'github', url: `https://github.com/${owner}/${repo}.git`, ref }
  }

  // GitHub URL: https://github.com/owner/repo
  const githubUrl = input.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (githubUrl) {
    const [, owner, repo] = githubUrl
    const cleanRepo = repo!.replace(/\.git$/, '')
    return { type: 'github', url: `https://github.com/${owner}/${cleanRepo}.git` }
  }

  // GitHub shorthand: owner/repo#branch or owner/repo/subpath
  const [cleanInput, fragmentRef] = extractBranchFragment(input)
  const shorthand = cleanInput.match(/^([^/]+)\/([^/]+)(?:\/(.+))?$/)
  if (shorthand && !cleanInput.includes(':')) {
    const [, owner, repo, subpath] = shorthand
    return {
      type: 'github',
      url: `https://github.com/${owner}/${repo}.git`,
      subpath,
      ref: fragmentRef,
    }
  }

  // Fallback: treat as github
  return { type: 'github', url: input }
}

export function getOwnerRepo(parsed: ParsedSource): string | null {
  if (parsed.type === 'local') return null
  try {
    const url = new URL(parsed.url)
    let path = url.pathname.slice(1).replace(/\.git$/, '')
    return path.includes('/') ? path : null
  } catch {
    return null
  }
}
