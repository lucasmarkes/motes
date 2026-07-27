import { Link } from '../router'
import { DOC_GROUPS, pagePath, type DocPage } from './nav'

interface SidebarProps {
  current: DocPage
  open: boolean
  onToggle: () => void
}

export function Sidebar({ current, open, onToggle }: SidebarProps) {
  return (
    <>
      <button
        type="button"
        className="doc-nav-toggle"
        aria-expanded={open}
        aria-controls="doc-sidebar"
        onClick={onToggle}
      >
        {open ? 'Close menu' : 'Menu'}
      </button>

      {open ? (
        <button
          type="button"
          className="doc-nav-scrim"
          aria-label="Close menu"
          onClick={onToggle}
        />
      ) : null}

      <aside
        id="doc-sidebar"
        className={`doc-sidebar ${open ? 'is-open' : ''}`}
        aria-label="Documentation"
      >
        {DOC_GROUPS.map((group) => (
          <section key={group.title} className="doc-nav-group">
            <p className="doc-nav-group-title">{group.title}</p>
            <ul>
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    to={pagePath(page)}
                    className={page.slug === current.slug ? 'is-active' : undefined}
                    onActivate={() => {
                      if (open) onToggle()
                    }}
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </aside>
    </>
  )
}
