import { useEffect, useState } from 'react'
import { SiteFooter, SiteHeader } from '../Chrome'
import { Link } from '../router'
import { adjacentPages, pageForPath } from './nav'
import { Sidebar } from './Sidebar'
import { Toc } from './Toc'
import { Breadcrumbs } from './primitives/Breadcrumbs'
import { PrevNext } from './primitives/PrevNext'

interface DocsProps {
  path: string
}

export function Docs({ path }: DocsProps) {
  const page = pageForPath(path)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (page) {
      document.title = `${page.title} — motes docs`
    } else {
      document.title = 'Not found — motes docs'
    }
  }, [page])

  useEffect(() => {
    setMenuOpen(false)
  }, [path])

  if (!page) return <DocsNotFound />

  const { prev, next } = adjacentPages(page)
  const { Component } = page

  return (
    <div className="docs">
      <SiteHeader docsActive />

      <div className="doc-layout rail">
        <Sidebar
          current={page}
          open={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
        />

        <article className="doc-article">
          <Breadcrumbs page={page} />
          <header className="doc-header">
            <h1>{page.title}</h1>
            <p className="doc-desc">{page.description}</p>
          </header>
          <Component />
          <PrevNext prev={prev} next={next} />
        </article>

        <Toc page={page} />
      </div>

      <div className="rail">
        <SiteFooter />
      </div>
    </div>
  )
}

function DocsNotFound() {
  return (
    <div className="docs">
      <SiteHeader docsActive />
      <main className="doc-404 rail">
        <h1>Page not found</h1>
        <p>
          That doc does not exist. <Link to="/docs">Back to docs</Link>.
        </p>
      </main>
    </div>
  )
}
