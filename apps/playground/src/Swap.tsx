interface SwapProps {
  /** Shown while `active`. */
  on: string
  /** Shown otherwise. */
  off: string
  active: boolean
  className?: string
}

/**
 * Cross-fades between two labels instead of replacing the text node.
 *
 * Both labels share one grid cell, so the box is always as wide as the longer
 * word — swapping "copy" for "copied" used to resize the control under the
 * cursor at the exact moment it was clicked.
 */
export function Swap({ on, off, active, className = '' }: SwapProps) {
  return (
    <span className={`swap ${className}`} aria-live="polite">
      <span className={active ? 'is-in' : 'is-out'} aria-hidden={!active}>
        {on}
      </span>
      <span className={active ? 'is-out' : 'is-in'} aria-hidden={active}>
        {off}
      </span>
    </span>
  )
}
