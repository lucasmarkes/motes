import { useEffect, useRef, useState } from 'react'
import type { DocPage } from './nav'

interface TocProps {
  page: DocPage
}

/** Matches `.doc-h2` / `.doc-h3` scroll-margin-top — fixed header + breathing room. */
const SCROLL_OFFSET = 96

function activeHeading(ids: string[]): string | null {
  if (ids.length === 0) return null

  let current: string | null = ids[0] ?? null
  if (!current) return null
  for (const id of ids) {
    const el = document.getElementById(id)
    if (!el) continue
    // Last heading whose top has crossed the activation line wins.
    if (el.getBoundingClientRect().top <= SCROLL_OFFSET + 4) current = id
  }
  return current
}

export function Toc({ page }: TocProps) {
  const ids = page.headings.map((h) => h.id)
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  const clickingRef = useRef(false)
  const clickTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setActive(ids[0] ?? null)
  }, [page.slug, ids[0]])

  useEffect(() => {
    if (ids.length === 0) return

    function sync() {
      if (clickingRef.current) return
      const next = activeHeading(ids)
      if (next) setActive(next)
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [page.slug, ids.join('|')])

  useEffect(() => {
    return () => window.clearTimeout(clickTimerRef.current)
  }, [])

  function scrollTo(id: string) {
    clickingRef.current = true
    setActive(id)

    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)

    window.clearTimeout(clickTimerRef.current)
    // Smooth scroll keeps firing scroll events; hold the clicked id until it settles.
    clickTimerRef.current = window.setTimeout(() => {
      clickingRef.current = false
      const next = activeHeading(ids)
      if (next) setActive(next)
    }, 700)
  }

  if (page.headings.length === 0) return null

  return (
    <nav className="doc-toc" aria-label="On this page">
      <p className="doc-toc-label">On this page</p>
      <ol>
        {page.headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'is-nested' : undefined}>
            <a
              href={`#${h.id}`}
              className={active === h.id ? 'is-active' : undefined}
              onClick={(e) => {
                e.preventDefault()
                scrollTo(h.id)
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
