import { useEffect, useMemo, useState } from 'react'
import { Link } from '../router'
import { LabPreview } from './LabPreview'
import { LabPanel } from './LabPanel'
import {
  DEFAULT_CONFIG,
  PRESETS,
  type Look,
  type PresetName,
  type StageConfig,
} from './pipeline'
import { decodeConfig, encodeConfig } from './url'

/**
 * The Lab: compose a field from the fixed five-stage pipeline and watch the
 * real library render it live. The preview compiles the exact GLSL the output
 * tab hands you, so nothing you see here can drift from the paste.
 *
 * State splits the way the panel does. `stage` is the pipeline — a change to it
 * recompiles the field. `look` is everything else motes takes: the glyphs, the
 * colour, the pointer — live uniform updates, no recompile. The field is never
 * chosen from a list, so `look` carries no `effect`. `name` labels the effect in
 * both output files.
 *
 * The three together are the whole composition, so they are the whole URL: every
 * edit rewrites the query string in place (no history spam), and a fresh load
 * decodes it back, which makes any Lab session a link you can send.
 */

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

/** Decode the opening composition from the URL once, at module scope, so the
 *  initial render already matches the link — no post-mount flash of the default
 *  field before the shared config lands. Guarded for non-browser (test) loads. */
const INITIAL_CONFIG =
  typeof window === 'undefined' ? DEFAULT_CONFIG : decodeConfig(window.location.search)

export function Lab() {
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<StageConfig>(INITIAL_CONFIG.stage)
  const [look, setLook] = useState<Look>(INITIAL_CONFIG.look)
  const [name, setName] = useState<string>(INITIAL_CONFIG.name)

  // Derived, not stored: the preset row lights up whenever the pipeline equals a
  // preset again — including right after loading one — and goes dark the moment
  // an edit pulls it away from every preset. One source of truth, the stage.
  const activePreset = useMemo(
    () => PRESET_NAMES.find((name) => sameStage(PRESETS[name], stage)) ?? '',
    [stage],
  )

  // The composition IS the URL. Every edit rewrites the query string in place —
  // replaceState, not pushState, so a tweak doesn't stack a history entry per
  // keystroke — and the name is stored raw (sanitized only in the output) so the
  // link round-trips exactly what the box shows.
  const config = useMemo(() => ({ name, stage, look }), [name, stage, look])
  useEffect(() => {
    const query = encodeConfig(config)
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [config])

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
        onPreset={(preset) => setStage(PRESETS[preset])}
        onStage={(patch) => setStage((prev) => ({ ...prev, ...patch }))}
        look={look}
        onLook={(patch) => setLook((prev) => ({ ...prev, ...patch }))}
        config={config}
        onName={setName}
      />
    </div>
  )
}
