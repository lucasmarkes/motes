import { useEffect, useState, type ReactNode, type Ref } from 'react'

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

/**
 * Shared by the tile you click and the stage you land on, so the preview
 * grows into the full field instead of being replaced by it.
 */
const MORPH = 'motes-field'

let morphSource: HTMLElement | null = null

/** Tag the element the next navigation should morph out of. */
export function morphFrom(el: HTMLElement | null): void {
  morphSource = el
}

export function navigate(to: string): void {
  if (to === window.location.pathname) return

  const commit = (): void => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const source = morphSource
  morphSource = null

  // Only a tile click nominates a source, and only that navigation earns a
  // transition. The panel's effect buttons are a control you flip repeatedly
  // while comparing effects — animating those made the page flash on every
  // click. Reduced motion and unsupported browsers get the same plain cut.
  if (
    !source ||
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    commit()
    return
  }

  if (source) source.style.viewTransitionName = MORPH
  const transition = document.startViewTransition(commit)

  // The name must not outlive the transition: two elements carrying the same
  // view-transition-name at once aborts the following one.
  void transition.finished.finally(() => {
    if (source) source.style.viewTransitionName = ''
  })
}

interface LinkProps {
  to: string
  className?: string
  /** The anchor itself, for callers that need to observe or measure it. */
  ref?: Ref<HTMLAnchorElement>
  /** Runs just before navigating — used to nominate a morph source. */
  onActivate?: () => void
  children: ReactNode
}

/** A real anchor, so middle-click, copy-link and keyboard focus all work. */
export function Link({ to, className, ref, onActivate, children }: LinkProps) {
  return (
    <a
      href={to}
      className={className}
      ref={ref}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        onActivate?.()
        navigate(to)
        window.scrollTo(0, 0)
      }}
    >
      {children}
    </a>
  )
}
