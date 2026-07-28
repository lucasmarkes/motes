import { useRef, useState } from 'react'
import type { KeyboardEvent as RKeyboardEvent } from 'react'
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
 *
 * A toolbar, not a radiogroup: a radiogroup promises exactly one selected
 * member, but hand-tweaking a colour leaves zero presets "on", which is a
 * valid state here. The roving index is tracked as its own piece of state,
 * seeded to the first button, rather than derived from `on` — unlike
 * `Palette.tsx`'s tabs, nothing may be selected, so there is no selected
 * value to fall back on for "which button is the tab stop." Arrow keys move
 * DOM focus only; toolbar buttons activate on Enter/Space, and applying a
 * whole colour scheme because someone pressed an arrow key to look around
 * would be hostile.
 */
export function Presets({ config, onChange }: Props) {
  const [focusIndex, setFocusIndex] = useState(0)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  function onToolbarKey(e: RKeyboardEvent<HTMLDivElement>) {
    let next: number
    if (e.key === 'ArrowRight') next = (focusIndex + 1) % PRESETS.length
    else if (e.key === 'ArrowLeft') next = (focusIndex - 1 + PRESETS.length) % PRESETS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = PRESETS.length - 1
    else return
    e.preventDefault()
    setFocusIndex(next)
    buttonRefs.current[next]?.focus()
  }

  return (
    <div className="presets" role="toolbar" aria-label="Presets" onKeyDown={onToolbarKey}>
      {PRESETS.map((p, i) => {
        const on =
          config.background === p.values.background &&
          config.ink === p.values.ink &&
          config.accent === p.values.accent
        return (
          <button
            key={p.id}
            ref={(el) => {
              buttonRefs.current[i] = el
            }}
            type="button"
            className={`preset${on ? ' is-on' : ''}`}
            aria-pressed={on}
            tabIndex={i === focusIndex ? 0 : -1}
            onFocus={() => setFocusIndex(i)}
            onClick={() => onChange(p.values)}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
