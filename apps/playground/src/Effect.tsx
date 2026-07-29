import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Motes } from '@lucasmarkes/motes-react'
import type { MotesOptions } from '@lucasmarkes/motes'
import { Panel } from './Panel'
import type { CatalogEntry } from './effects'
import { Link } from './router'
import { POINTER_HINT } from './hint'
import { fieldTone } from './tone'

interface EffectProps {
  entry: CatalogEntry
  config: MotesOptions
  onChange: (patch: Partial<MotesOptions>) => void
  /** Swaps the whole config at once — what reset and randomize need. */
  onReplace: (next: MotesOptions) => void
  /** Journeys completed. The panel restages itself on each one; see Panel. */
  arrivals: number
}

export function Effect({ entry, config, onChange, onReplace, arrivals }: EffectProps) {
  const [touched, setTouched] = useState(false)

  // The head and the hint sit on the field with no container, so both read
  // their colours from what the field currently is. See tone.ts.
  const tone = fieldTone(config.background)

  return (
    <div
      className="stage-shell"
      data-tone={tone.light ? 'light' : 'dark'}
      style={{ '--field-wash': tone.rgb } as CSSProperties}
    >
      <Motes
        {...config}
        className="stage"
        aria-label={`${entry.title} field`}
        onPointerMove={() => setTouched(true)}
        onPointerDown={() => setTouched(true)}
      />

      <header className="stage-head">
        <Link to="/" className="back">
          <span aria-hidden="true">←</span> All effects
        </Link>
        <h1>{entry.title}</h1>
        <code className={`stage-tag ${entry.custom ? 'is-yours' : ''}`}>
          {entry.tag}
        </code>
        <p>{entry.detail}</p>
      </header>

      {/* Kept mounted so it can animate out. Unmounting on first move made it
          vanish mid-gesture, which is the one moment the eye is on it. */}
      {config.pointer ? (
        <p className={`hint ${touched ? 'is-out' : ''}`} aria-hidden={touched}>
          {POINTER_HINT}
        </p>
      ) : (
        <p className="hint hint-off">interaction off — time is the only input</p>
      )}

      <Panel config={config} onChange={onChange} onReplace={onReplace} arrivals={arrivals} />
    </div>
  )
}
