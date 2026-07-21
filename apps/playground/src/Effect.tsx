import { useState } from 'react'
import { Motes } from '@motes/react'
import type { MotesOptions } from 'motes'
import { Panel } from './Panel'
import type { CatalogEntry } from './effects'
import { Link } from './router'
import { POINTER_HINT } from './hint'

interface EffectProps {
  entry: CatalogEntry
  config: MotesOptions
  onChange: (patch: Partial<MotesOptions>) => void
}

export function Effect({ entry, config, onChange }: EffectProps) {
  const [touched, setTouched] = useState(false)

  return (
    <div className="stage-shell">
      <Motes
        {...config}
        className="stage"
        aria-label={`${entry.title} field`}
        onPointerMove={() => setTouched(true)}
        onPointerDown={() => setTouched(true)}
      />

      <header className="stage-head">
        <Link to="/" className="back">
          <span aria-hidden="true">←</span> all effects
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
