import { LINKS } from './links'

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
    <nav className="out-links" aria-label="motes elsewhere">
      <Out href={LINKS.github}>github</Out>
      <Out href={LINKS.npm}>npm</Out>
      <Out href={LINKS.x}>x</Out>
    </nav>
  )
}

/**
 * Fixed to the top, on the rail, and transparent.
 *
 * A bar with its own fill would sit on top of the page; this one is a line of
 * text over the field, held legible by a short scrim, and the field goes on
 * reacting underneath it — the container takes no pointer events, only the
 * links themselves do.
 */
export function SiteHeader() {
  return (
    <header className="site-head">
      <div className="rail site-head-row">
        <a className="site-mark" href="/">
          motes
        </a>
        <OutLinks />
      </div>
    </header>
  )
}
