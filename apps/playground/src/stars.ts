import { useEffect, useState } from 'react'
import { LINKS } from './links'

export const STARS_KEY = 'motes:stars'

/** Six hours. Unauthenticated GitHub allows 60 requests an hour per IP; at
 *  this TTL a single visitor spends four of them a day. */
export const STARS_TTL = 6 * 60 * 60 * 1000

/**
 * `owner/repo`, derived rather than written down.
 *
 * `links.ts` already names the repository, and a second copy here is a second
 * thing to forget when it moves.
 */
export function repoPath(url: string = LINKS.github): string | null {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)(?:[/?#]|$)/.exec(url)
  return m ? `${m[1]}/${m[2]}` : null
}

/**
 * The star count, or `null` for every reason there might not be one.
 *
 * Zero returns `null` deliberately. "No stars yet" and "no answer" render the
 * same — a button that reads `GitHub` — so the component has one absent case
 * to handle instead of two, and a fresh repository does not display a zero
 * next to a star as though that were a verdict rather than an age.
 */
export function parseCount(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null
  const n = (body as { stargazers_count?: unknown }).stargazers_count
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

interface Cached {
  n: number
  at: number
}

export function readCache(now: number): number | null {
  try {
    const raw = localStorage.getItem(STARS_KEY)
    if (!raw) return null
    const v: unknown = JSON.parse(raw)
    if (typeof v !== 'object' || v === null) return null
    const { n, at } = v as Partial<Cached>
    if (typeof n !== 'number' || typeof at !== 'number') return null
    const age = now - at
    // A negative age means the clock moved backwards since the write. Treat
    // it as a miss rather than trusting an entry from the future.
    if (age < 0 || age > STARS_TTL) return null
    return n
  } catch {
    // Corrupt JSON, or localStorage itself throwing — Safari does that in
    // private mode on read as well as write.
    return null
  }
}

export function writeCache(n: number, now: number): void {
  try {
    localStorage.setItem(STARS_KEY, JSON.stringify({ n, at: now } satisfies Cached))
  } catch {
    // Full, or denied. The count still renders this view; it just will not
    // survive to the next one.
  }
}

/**
 * The count for this page view — decided once, at first render, and never
 * changed while you are looking at it.
 *
 * The obvious implementation renders whatever the fetch returns. Measured on
 * a cold cache with a four-digit count, that moved the install button 26px
 * across the page about 400ms after paint: the row is centred, so a number
 * appearing on the right pushes the left half left. `PerformanceObserver`
 * scored it CLS 0.0000 and was wrong, which is worth knowing — a direct
 * position probe is what caught it, both here and in the font work before it.
 *
 * So the count comes from the cache, which is read during the first render;
 * the request runs only to fill that cache for next time. Nothing appears
 * mid-view, and every reason there might be no number — a fresh repository,
 * an offline visitor, a rate limit, a private-mode browser, or simply a first
 * visit — renders as the same button.
 *
 * This is the policy the page already applies to its typeface, for the same
 * reason: `font-display: optional` makes the browser commit to one font for
 * the page view rather than swapping partway through. The cost is identical
 * too — the very first view is the one that goes without.
 */
export function useStars(): number | null {
  const [stars] = useState<number | null>(() => readCache(Date.now()))

  useEffect(() => {
    if (stars !== null) return

    const repo = repoPath()
    if (!repo) return

    const ac = new AbortController()

    void (async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
          signal: ac.signal,
          headers: { Accept: 'application/vnd.github+json' },
        })
        if (!res.ok) return
        const n = parseCount(await res.json())
        if (n !== null) writeCache(n, Date.now())
      } catch {
        // Offline, aborted, rate-limited, CORS, or a body that is not JSON.
        // Every one of them leaves the cache as it was.
      }
    })()

    return () => ac.abort()
  }, [stars])

  return stars
}
