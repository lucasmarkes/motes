import { useMemo, useState } from 'react'
import { DEFAULT_OPTIONS } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from '../accent'
import { Link } from '../router'
import { LabPreview } from './LabPreview'
import { PRESETS } from './pipeline'

/**
 * Phase 2: the live preview, standing alone. Fire runs as the entry point, the
 * real library composing the real generated field. The composer UI and presets
 * arrive in Phase 3; for now this proves the field compiles, animates, and
 * reacts to the cursor with no pointer code of its own.
 */
export function Lab() {
  const [error, setError] = useState<string | null>(null)

  // Stable identity: the preview recompiles only when the field changes, and
  // re-applies look only when look changes.
  const look = useMemo(() => ({ ...DEFAULT_OPTIONS, accent: POINTER_ACCENT }), [])

  return (
    <div className="stage-shell">
      <LabPreview
        stage={PRESETS.fire}
        look={look}
        onError={setError}
        className="stage"
        aria-label="lab preview field"
      />

      <header className="stage-head">
        <Link to="/" className="back">
          <span aria-hidden="true">←</span> All effects
        </Link>
        <h1>Lab</h1>
        <code className="stage-tag is-yours">preview</code>
        <p>fire, composed from the pipeline and running live</p>
      </header>

      {error ? (
        <p className="hint hint-off" role="status">
          compile error — showing last good field: {error}
        </p>
      ) : null}
    </div>
  )
}
