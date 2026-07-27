import { useEffect, useState } from 'react'
import type { DocPage } from './nav'

interface TocProps {
  page: DocPage
}

export function Toc({ page }: TocProps) {
  const [active, setActive] = useState<string | null>(page.headings[0]?.id ?? null)

  useEffect(() => {
    const ids = page.headings.map((h) => h.id)
    if (ids.length === 0) return

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [page])

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
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })
                history.replaceState(null, '', `#${h.id}`)
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
