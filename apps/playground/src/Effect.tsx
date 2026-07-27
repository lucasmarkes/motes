import { useState } from 'react'
import type { MotesOptions } from '@lucasmarkes/motes'
import { Panel } from './Panel'
import type { CatalogEntry } from './effects'
import { Link } from './router'
import { POINTER_HINT } from './hint'

interface EffectProps {
  entry: CatalogEntry
  config: MotesOptions
  onChange: (patch: Partial<MotesOptions>) => void
}

/**
 * An effect page is chrome now, not a canvas. The field is the one persistent
 * layer behind the whole app (see App.tsx and Field.tsx); this page only dresses
 * it — a title, a hint, the tuning panel — and repoints it through the shared
 * handle when you switch effects. So there is no `<Motes>` here to receive the
 * pointer: the move that dismisses the hint is read off the shell, and the field
 * itself reacts to the cursor by hit-testing it against the canvas box, the same
 * for every effect, whatever is stacked over it.
 */
export function Effect({ entry, config, onChange }: EffectProps) {
  const [touched, setTouched] = useState(false)

  return (
    <div
      className="stage-shell"
      onPointerMove={() => setTouched(true)}
      onPointerDown={() => setTouched(true)}
    >
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

      <Panel config={config} onChange={onChange} />
    </div>
  )
}
