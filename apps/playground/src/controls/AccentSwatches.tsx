import { useId } from 'react'
import { ACCENTS } from '../accents'

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * The pointer's temperature, as six cells and a way out.
 *
 * `<input type="color">` was the single most default-looking element on the
 * page — a control that opens an operating system on top of a page about
 * restraint, to pick from sixteen million colours when the field is designed
 * to hold one. It is still here, because someone should be able to put
 * anything they like in, but it is now the seventh cell rather than the
 * first thing you see.
 *
 * The six tile the panel's full content width at `flex: 1`. That is not
 * cosmetic: six 44px targets with the usual pseudo-element padding would
 * overlap each other in 286px, and a target that steals its neighbour's edge
 * is worse than a small one. Tiling makes every cell 47.6 × 44 with the
 * boundaries exactly where they look like they are.
 */
export function AccentSwatches({ value, onChange }: Props) {
  const customId = useId()
  const preset = ACCENTS.some((a) => a.hex.toLowerCase() === value.toLowerCase())

  return (
    <div className="accent">
      <div className="swatches" role="radiogroup" aria-label="Accent">
        {ACCENTS.map((a) => (
          <button
            key={a.hex}
            type="button"
            role="radio"
            aria-checked={a.hex.toLowerCase() === value.toLowerCase()}
            aria-label={a.label}
            className="swatch"
            onClick={() => onChange(a.hex)}
          >
            <span className="chip" style={{ background: a.hex }} aria-hidden="true" />
          </button>
        ))}

        {/* The way out. A cell like the others so the row stays one object,
            but drawn as an outline rather than a fill — it is not a colour,
            it is a door to all of them. */}
        <label
          className={`swatch swatch-custom${preset ? '' : ' is-on'}`}
          htmlFor={customId}
          title="Custom accent"
        >
          <span className="chip chip-custom" style={{ background: preset ? undefined : value }} />
          <input
            id={customId}
            type="color"
            value={value}
            aria-label="Custom accent"
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>

      <span className="hex">{value.toLowerCase()}</span>
    </div>
  )
}
