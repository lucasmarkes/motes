import type { ReactNode } from 'react'

type CalloutKind = 'note' | 'tip' | 'warn'

interface CalloutProps {
  kind?: CalloutKind
  title?: string
  children: ReactNode
}

export function Callout({ kind = 'note', title, children }: CalloutProps) {
  const label = title ?? (kind === 'tip' ? 'Tip' : kind === 'warn' ? 'Warning' : 'Note')
  return (
    <aside className={`doc-callout is-${kind}`} role="note">
      <p className="doc-callout-title">{label}</p>
      <div className="doc-callout-body">{children}</div>
    </aside>
  )
}
