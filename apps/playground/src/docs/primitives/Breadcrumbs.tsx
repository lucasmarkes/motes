import { Link } from '../../router'
import type { DocPage } from '../nav'

export function Breadcrumbs({ page }: { page: DocPage }) {
  return (
    <nav className="doc-crumb" aria-label="Breadcrumb">
      <Link to="/docs">Docs</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{page.title}</span>
    </nav>
  )
}
