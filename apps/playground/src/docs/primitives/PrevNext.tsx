import { Link } from '../../router'
import { pagePath, type DocPage } from '../nav'

interface PrevNextProps {
  prev?: DocPage
  next?: DocPage
}

export function PrevNext({ prev, next }: PrevNextProps) {
  if (!prev && !next) return null

  return (
    <nav className="doc-pager" aria-label="Pagination">
      {prev ? (
        <Link to={pagePath(prev)} className="doc-pager-link is-prev">
          <span className="doc-pager-kicker">Previous</span>
          <span className="doc-pager-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={pagePath(next)} className="doc-pager-link is-next">
          <span className="doc-pager-kicker">Next</span>
          <span className="doc-pager-title">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
