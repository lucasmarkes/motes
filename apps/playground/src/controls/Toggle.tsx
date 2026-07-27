interface ToggleProps {
  label: string
  /** The live state in words, shown under the label — "pointer-reactive" and
   *  the like. It changes with `on`; the label does not. */
  state: string
  on: boolean
  onChange: (on: boolean) => void
}

/**
 * The panel's switch: a two-line label beside a thrown pill.
 *
 * Extracted from the effect panel's interaction toggle so the Lab's flicker and
 * interaction switches are the same control, not a second copy of the markup.
 * The throw and the colour live in the stylesheet's `.toggle`; this only wires
 * the pressed state and the words.
 */
export function Toggle({ label, state, on, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      className={`toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        <span className="toggle-state">{state}</span>
      </span>
      <span className="track" aria-hidden="true">
        <i />
      </span>
    </button>
  )
}
