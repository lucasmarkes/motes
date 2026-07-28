import type { MotesOptions } from '@lucasmarkes/motes'
import { PRESETS } from '../presets'

interface Props {
  config: MotesOptions
  onChange: (patch: Partial<MotesOptions>) => void
}

/**
 * A preset is "on" when the field already matches it, not when it was the last
 * one clicked — otherwise nudging a colour by hand would leave a button lying
 * about the state it describes.
 */
export function Presets({ config, onChange }: Props) {
  return (
    <div className="presets" role="group" aria-label="Presets">
      {PRESETS.map((p) => {
        const on =
          config.background === p.values.background &&
          config.ink === p.values.ink &&
          config.accent === p.values.accent
        return (
          <button
            key={p.id}
            type="button"
            className={`preset${on ? ' is-on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(p.values)}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
