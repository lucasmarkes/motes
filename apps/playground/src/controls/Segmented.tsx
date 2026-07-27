import type { CSSProperties } from 'react'

export interface SegOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  /** Names the group for assistive tech; not rendered. */
  label: string
  options: readonly SegOption<T>[]
  /**
   * The selected value. A value matching no option shows no pill — the control
   * then reads as "nothing chosen", which the Lab uses for its preset row once
   * the pipeline has been edited away from every preset.
   */
  value: string
  onChange: (value: T) => void
}

/**
 * A recessed track with the active choice as a filled pill riding inside it.
 *
 * Extracted verbatim from the panel's effect selector — same `.seg` markup, the
 * same `--seg-n`/`--seg-i` custom properties driving the sliding pill — so the
 * Lab's pipeline enums, preset row, and the panel all share one control rather
 * than a parallel reimplementation. The geometry lives in the stylesheet; this
 * only supplies the count and the active index.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const active = options.findIndex((o) => o.value === value)

  return (
    <div
      className="seg"
      role="group"
      aria-label={label}
      style={{ '--seg-n': options.length, '--seg-i': Math.max(0, active) } as CSSProperties}
    >
      {/* One pill rides between the cells, behind the labels — but only when
          the value is one of them; otherwise nothing reads as chosen. */}
      {active >= 0 ? <span className="seg-pill" aria-hidden="true" /> : null}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'on' : ''}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
