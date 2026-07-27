import { DOC_PAGES, pagePath, type DocPage } from './nav'

export interface SearchResult {
  page: DocPage
  /** What matched — page title, description, or a heading. */
  match: string
  score: number
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ')
}

/** Substring + simple token overlap scoring. Good enough for ~12 pages. */
export function searchDocs(query: string, limit = 8): SearchResult[] {
  const q = normalize(query.trim())
  if (!q) return DOC_PAGES.slice(0, limit).map((page) => ({ page, match: page.title, score: 1 }))

  const results: SearchResult[] = []

  for (const page of DOC_PAGES) {
    const title = normalize(page.title)
    const desc = normalize(page.description)

    if (title.includes(q)) {
      results.push({ page, match: page.title, score: 100 + (title.startsWith(q) ? 10 : 0) })
    } else if (desc.includes(q)) {
      results.push({ page, match: page.description, score: 50 })
    }

    for (const h of page.headings) {
      const ht = normalize(h.text)
      if (ht.includes(q)) {
        results.push({ page, match: h.text, score: 40 + (ht.startsWith(q) ? 5 : 0) })
      }
    }

    // Token overlap on slug
    if (page.slug && page.slug.replace(/-/g, ' ').includes(q)) {
      results.push({ page, match: page.title, score: 30 })
    }
  }

  results.sort((a, b) => b.score - a.score)

  // Dedupe by page slug, keep best score
  const seen = new Set<string>()
  const out: SearchResult[] = []
  for (const r of results) {
    if (seen.has(r.page.slug)) continue
    seen.add(r.page.slug)
    out.push(r)
    if (out.length >= limit) break
  }

  return out
}

export { pagePath }
