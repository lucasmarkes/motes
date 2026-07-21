import { useEffect, useState, type ReactNode } from 'react'

/**
 * Path-based routing, no dependency and no knowledge of its own origin.
 * Every path is relative, so localhost and any deployment behave identically.
 */
export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const sync = (): void => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return path
}

export function navigate(to: string): void {
  if (to === window.location.pathname) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

interface LinkProps {
  to: string
  className?: string
  children: ReactNode
}

/** A real anchor, so middle-click, copy-link and keyboard focus all work. */
export function Link({ to, className, children }: LinkProps) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(to)
        window.scrollTo(0, 0)
      }}
    >
      {children}
    </a>
  )
}
