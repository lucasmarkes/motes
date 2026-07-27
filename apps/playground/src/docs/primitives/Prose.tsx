import type { ReactNode } from 'react'

/** Readable doc body — typography and vertical rhythm for long-form content. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="doc-prose">{children}</div>
}
