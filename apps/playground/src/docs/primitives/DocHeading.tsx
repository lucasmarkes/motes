import type { ReactNode } from 'react'

interface DocHeadingProps {
  id: string
  level?: 2 | 3
  children: ReactNode
}

export function DocHeading({ id, level = 2, children }: DocHeadingProps) {
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <Tag id={id} className={level === 2 ? 'doc-h2' : 'doc-h3'}>
      {children}
    </Tag>
  )
}
