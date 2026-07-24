import { useEffect, useMemo, useState } from 'react'
import { Link } from '../router'
import { LabPreview } from './LabPreview'
import { LabControls } from './LabControls'
import { CodeOutput } from '../controls/CodeOutput'
import {
  DEFAULT_CONFIG,
  PRESETS,
  type Look,
  type PresetName,
  type StageConfig,
} from './pipeline'
import { labSource, type LabTab } from './source'
import { decodeConfig, encodeConfig } from './url'

/**
 * The Lab: compose a field from the fixed five-stage pipeline and watch the
 * real library render it live. The preview compiles the exact GLSL the code
 * panel hands you, so nothing you see here can drift from the paste.
 *
 * Three zones, each with one job. The field takes the width of the upper area;
 * the code panel is the narrow rail beside it, which is the shape GLSL wants;
 * the dock spans the foot, the pipeline laid out as columns rather than a
 * scrolling stack. The two dock tiers are the two files the code panel shows —
 * the pipeline compiles to effects.ts, the look and pointer are props in App.tsx.
 *
 * State splits the way the layout does. `stage` is the pipeline — a change to it
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

/** The preset a stage exactly equals, or '' for a composition that matches none. */
function matchPreset(stage: StageConfig): PresetName | '' {
  return PRESET_NAMES.find((name) => sameStage(PRESETS[name], stage)) ?? ''
}

/** The opening composition, read from the URL at the moment the Lab mounts.
 *  A lazy initializer, not a module constant: the Lab is reached by client-side
 *  navigation (the index's "yours" tile links to /lab with the rain preset in
 *  the query), so the search string only carries the shared config once that
 *  navigation has happened — a value frozen at module load would always be the
 *  default. Reading it here also means the first render already matches the
 *  link, with no flash of the default field. Guarded for non-browser tests. */
function initialConfig() {
  return typeof window === 'undefined' ? DEFAULT_CONFIG : decodeConfig(window.location.search)
}

export function Lab() {
  const [error, setError] = useState<string | null>(null)
  const [initial] = useState(initialConfig)
  const [stage, setStage] = useState<StageConfig>(initial.stage)
  const [look, setLook] = useState<Look>(initial.look)
  const [name, setName] = useState<string>(initial.name)
  const [tab, setTab] = useState<LabTab>('effects')

  // Derived, not stored: the preset chip fills whenever the pipeline equals a
  // preset again — including right after loading one — and stops filling the
  // moment an edit pulls it away. One source of truth, the stage.
  const activePreset = useMemo(() => matchPreset(stage), [stage])

  // The anchor. Where the exact match tells you the pipeline IS a preset, this
  // remembers which preset it last WAS, and holds that through every edit — so
  // the row keeps a lit chip to reset to instead of going dark on the first
  // tweak. Seeded from the opening config, then re-pinned each time an edit
  // lands the pipeline back on some preset exactly.
  const [basePreset, setBasePreset] = useState<PresetName | ''>(() => matchPreset(initial.stage))
  useEffect(() => {
    if (activePreset) setBasePreset(activePreset)
  }, [activePreset])

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
    <div className="lab-shell">
      <div className="lab-field-wrap">
        <LabPreview
          stage={stage}
          look={look}
          onError={setError}
          className="lab-field"
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
      </div>

      <LabControls
        stage={stage}
        onStage={(patch) => setStage((prev) => ({ ...prev, ...patch }))}
        look={look}
        onLook={(patch) => setLook((prev) => ({ ...prev, ...patch }))}
        activePreset={activePreset}
        basePreset={basePreset}
        onPreset={(preset) => setStage(PRESETS[preset])}
        config={config}
        onName={setName}
      />

      <div className="lab-code">
        <CodeOutput
          tabs={OUTPUT_TABS}
          active={tab}
          onTab={(id) => setTab(id as LabTab)}
          code={labSource(tab, config)}
          label="Output files"
        />
      </div>
    </div>
  )
}

const OUTPUT_TABS = [
  { id: 'effects', label: 'effects.ts' },
  { id: 'app', label: 'App.tsx' },
] as const
