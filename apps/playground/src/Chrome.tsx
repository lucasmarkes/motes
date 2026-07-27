import { LINKS, AUTHOR } from './links'
import { Link } from './router'
import { useSearch } from './docs/Search'

/** Off-site, so a new tab — the field on the page you came from stays alive. */
export function Out({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** github / npm / x, in that order, wherever they appear. */
export function OutLinks() {
  return (
    <div className="out-links" aria-label="motes elsewhere">
      <Out href={LINKS.github}>github</Out>
      <Out href={LINKS.npm}>npm</Out>
      <Out href={LINKS.x}>x</Out>
    </div>
  )
}

interface SiteHeaderProps {
  docsActive?: boolean
}

/**
 * Fixed to the top, on the rail, and transparent.
 */
export function SiteHeader({ docsActive }: SiteHeaderProps = {}) {
  const { open: openSearch } = useSearch()

  return (
    <header className="site-head">
      <div className="rail site-head-row">
        <a className="site-mark" href="/">
          motes
        </a>
        <nav className="site-nav" aria-label="Site">
          <Link to="/docs" className={docsActive ? 'is-active' : undefined}>
            docs
          </Link>
          <button type="button" className="site-search" onClick={openSearch}>
            Search
            <kbd aria-hidden="true">⌘K</kbd>
          </button>
          <OutLinks />
        </nav>
      </div>
    </header>
  )
}

/**
 * One line.
 *
 * github / npm / x used to appear here as well as in the bar, which meant the
 * page answered the same question twice and neither answer read as the real
 * one. The bar is the persistent nav and it is always on screen, so it keeps
 * them; the footer keeps only what the bar cannot say — whose this is, and
 * where the source lives.
 *
 * The badge row that used to sit under this — MOTES · MIT · ZERO RUNTIME
 * DEPENDENCIES · WEBGL2 — is gone. Two of those four were facts about the
 * page rather than claims worth making, and the two that were worth making
 * are now under the install command, which is the only place either of them
 * is a live question.
 */
export function SiteFooter() {
  return (
    <footer className="foot">
      <p className="foot-credit">
        Built by <Out href={LINKS.author}>{AUTHOR}</Out>. Source on{' '}
        <Out href={LINKS.github}>GitHub</Out>.
      </p>
    </footer>
  )
}
