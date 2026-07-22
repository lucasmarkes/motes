import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseCount, readCache, repoPath, writeCache, STARS_KEY, STARS_TTL } from './stars'

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('repoPath', () => {
  it('parses owner/repo out of the URL links.ts already holds', () => {
    // The point of deriving it: the repository is named once in the codebase.
    expect(repoPath()).toBe('lucasmarkes/motes')
  })

  it('tolerates a trailing slash, a query and a fragment', () => {
    expect(repoPath('https://github.com/a/b/')).toBe('a/b')
    expect(repoPath('https://github.com/a/b?tab=readme')).toBe('a/b')
    expect(repoPath('https://github.com/a/b#install')).toBe('a/b')
  })

  it('returns null for anything that is not a GitHub repo URL', () => {
    expect(repoPath('https://example.com/a/b')).toBeNull()
    expect(repoPath('https://github.com/lucasmarkes')).toBeNull()
    expect(repoPath('not a url')).toBeNull()
  })
})

describe('parseCount', () => {
  it('reads stargazers_count', () => {
    expect(parseCount({ stargazers_count: 128 })).toBe(128)
  })

  it('returns null for zero, so "no stars yet" is the same state as "no answer"', () => {
    expect(parseCount({ stargazers_count: 0 })).toBeNull()
  })

  it('returns null for a malformed payload', () => {
    expect(parseCount({})).toBeNull()
    expect(parseCount(null)).toBeNull()
    expect(parseCount('nope')).toBeNull()
    expect(parseCount({ stargazers_count: '12' })).toBeNull()
    expect(parseCount({ stargazers_count: Number.NaN })).toBeNull()
    // A 403 body from the rate limiter has a message and no count.
    expect(parseCount({ message: 'API rate limit exceeded' })).toBeNull()
  })
})

describe('cache', () => {
  it('round-trips through localStorage', () => {
    writeCache(128, 1_000)
    expect(readCache(1_000)).toBe(128)
  })

  it('still returns the value one millisecond inside the TTL', () => {
    writeCache(128, 1_000)
    expect(readCache(1_000 + STARS_TTL - 1)).toBe(128)
  })

  it('returns null once the TTL has passed', () => {
    writeCache(128, 1_000)
    expect(readCache(1_000 + STARS_TTL + 1)).toBeNull()
  })

  it('returns null for a clock that has gone backwards', () => {
    // A machine whose clock was corrected backwards would otherwise hold a
    // stale count until the clock caught up.
    writeCache(128, 10_000)
    expect(readCache(1_000)).toBeNull()
  })

  it('returns null rather than throwing on a corrupt entry', () => {
    localStorage.setItem(STARS_KEY, 'not json')
    expect(readCache(1_000)).toBeNull()
    localStorage.setItem(STARS_KEY, JSON.stringify({ nope: true }))
    expect(readCache(1_000)).toBeNull()
  })

  it('returns null when reading localStorage throws', () => {
    // Safari in private mode.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied')
    })
    expect(readCache(1_000)).toBeNull()
  })

  it('does not throw when writing localStorage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota')
    })
    expect(() => writeCache(128, 1_000)).not.toThrow()
  })
})
