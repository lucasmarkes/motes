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
        <h1>
          <span className="idx">{entry.index}</span>
          {entry.title}
        </h1>
        <p>{entry.detail}</p>
      </header>

      {config.pointer && !touched ? (
        <p className="hint">{POINTER_HINT}</p>
      ) : null}

      {!config.pointer ? (
        <p className="hint hint-off">
          interaction off — this is what everyone else ships
        </p>
      ) : null}

      <Panel config={config} onChange={onChange} />
    </div>
  )
}
