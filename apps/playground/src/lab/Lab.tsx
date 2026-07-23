import { useMemo, useState } from 'react'
import { DEFAULT_OPTIONS } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from '../accent'
import { Link } from '../router'
import { LabPreview } from './LabPreview'
import { LabPanel, type Look } from './LabPanel'
import { PRESETS, type PresetName, type StageConfig } from './pipeline'

/**
 * The Lab: compose a field from the fixed five-stage pipeline and watch the
 * real library render it live. The preview compiles the exact GLSL the output
 * tab will hand you (Phase 4), so nothing you see here can drift from the paste.
 *
 * State splits the way the panel does. `stage` is the pipeline — a change to it
 * recompiles the field. `look` is everything else motes takes: the glyphs, the
 * colour, the pointer — live uniform updates, no recompile. The field is never
 * chosen from a list, so `look` carries no `effect`.
 */

/** The look, minus the effect the preview owns. Starts from the library's
 *  defaults with this page's cool accent, same as the effect stage. */
const INITIAL_LOOK: Look = (() => {
  const { effect: _effect, ...rest } = DEFAULT_OPTIONS
  return { ...rest, accent: POINTER_ACCENT }
})()

/** Flat config, so field-by-field equality is all a preset match needs. */
function sameStage(a: StageConfig, b: StageConfig): boolean {
  return (
    a.turbulence === b.turbulence &&
    a.pattern === b.pattern &&
    a.flow === b.flow &&
    a.speed === b.speed &&
    a.mask === b.mask &&
    a.falloff === b.falloff &&
    a.contrast === b.contrast &&
    a.flicker === b.flicker
  )
}

const PRESET_NAMES = Object.keys(PRESETS) as PresetName[]

export function Lab() {
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<StageConfig>(PRESETS.fire)
  const [look, setLook] = useState<Look>(INITIAL_LOOK)

  // Derived, not stored: the preset row lights up whenever the pipeline equals a
  // preset again — including right after loading one — and goes dark the moment
  // an edit pulls it away from every preset. One source of truth, the stage.
  const activePreset = useMemo(
    () => PRESET_NAMES.find((name) => sameStage(PRESETS[name], stage)) ?? '',
    [stage],
  )

  return (
    <div className="stage-shell">
      <LabPreview
        stage={stage}
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
        <code className="stage-tag is-yours">compose</code>
        <p>build a field from the five-stage pipeline, running live</p>
      </header>

      {error ? (
        <p className="hint hint-off" role="status">
          compile error — showing last good field: {error}
        </p>
      ) : null}

      <LabPanel
        stage={stage}
        activePreset={activePreset}
        onPreset={(name) => setStage(PRESETS[name])}
        onStage={(patch) => setStage((prev) => ({ ...prev, ...patch }))}
        look={look}
        onLook={(patch) => setLook((prev) => ({ ...prev, ...patch }))}
      />
    </div>
  )
}
