import { Slider } from '../controls/Slider'
import { Segmented, type SegOption } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { CharsetSelect } from '../controls/CharsetSelect'
import { AccentSwatches } from '../controls/AccentSwatches'
import {
  DEFAULT_NAME,
  type Flow,
  type LabConfig,
  type Look,
  type Mask,
  type Pattern,
  type PresetName,
  type StageConfig,
} from './pipeline'

const PRESET_ORDER: readonly PresetName[] = ['fire', 'rain', 'aurora', 'pulse']

const PATTERN_OPTIONS: readonly SegOption<Pattern>[] = [
  { value: 'fbm', label: 'fbm' },
  { value: 'bands', label: 'bands' },
  { value: 'lanes', label: 'lanes' },
  { value: 'rings', label: 'rings' },
]

const FLOW_OPTIONS: readonly SegOption<Flow>[] = [
  { value: 'up', label: 'up' },
  { value: 'down', label: 'down' },
  { value: 'still', label: 'still' },
]

const MASK_OPTIONS: readonly SegOption<Mask>[] = [
  { value: 'bottom', label: 'bottom' },
  { value: 'top', label: 'top' },
  { value: 'center', label: 'center' },
  { value: 'none', label: 'none' },
]

const one = (v: number) => v.toFixed(1)

interface LabControlsProps {
  stage: StageConfig
  onStage: (patch: Partial<StageConfig>) => void
  look: Look
  onLook: (patch: Partial<Look>) => void
  /** The preset the stage currently equals exactly, or '' once edited. */
  activePreset: string
  /** The preset the stage descends from, held through edits so the row keeps its
   *  anchor. Equals activePreset while clean; stays put once edited away. */
  basePreset: string
  /** Load a preset wholesale — the entry point, and the reset for the edited chip. */
  onPreset: (name: PresetName) => void
  /** The full composition, for the name field. */
  config: LabConfig
  onName: (name: string) => void
  /** Whether the code slide-over is open (only meaningful below 1600px). */
  codeOpen: boolean
  /** Toggle the code slide-over. */
  onToggleCode: () => void
}

/**
 * The dock: the pipeline as four columns, dressed by a subordinate strip.
 *
 * The two tiers are the two output files. The four columns compile down to the
 * GLSL of effects.ts — a change to any of them relinks the field. The strip
 * below is the props on <Motes>: the look and the pointer, live uniforms that
 * never recompile, which is App.tsx. Read top-to-bottom, the dock is the
 * architecture — what you are making, then how it is shown.
 *
 * A stage with a single value folds it into its header rather than spending a
 * labelled row on it: "Flow" and its speed sit on one line, the segmented and
 * the bare track below. Shape carries three, so it keeps a label on each.
 */
export function LabControls({
  stage,
  onStage,
  look,
  onLook,
  activePreset,
  basePreset,
  onPreset,
  config,
  onName,
  codeOpen,
  onToggleCode,
}: LabControlsProps) {
  // Edited iff we have an anchor to have drifted from and no exact match now.
  const edited = activePreset === '' && basePreset !== ''

  return (
    <section className="lab-controls" aria-label="Pipeline">
      <button
        type="button"
        className="code-toggle"
        aria-pressed={codeOpen}
        aria-label="Toggle code panel"
        onClick={onToggleCode}
      >
        {codeOpen ? 'Hide code' : 'Show code'}
      </button>

      <div className="controls-presets" role="group" aria-label="Start from a preset">
        <span className="preset-lead">Start from</span>
        <div className="chips">
          {PRESET_ORDER.map((name) => {
            // Three states from one source, the stage: filled when the pipeline
            // is exactly this preset, ink-outlined when it began here and has
            // since been edited, muted otherwise. Clicking any chip loads it —
            // which is also how the edited chip resets to where it started.
            const on = activePreset === name
            const anchor = edited && basePreset === name
            const cls = `chip${on ? ' is-on' : ''}${anchor ? ' is-edited' : ''}`
            return (
              <button
                key={name}
                type="button"
                className={cls}
                aria-pressed={on}
                onClick={() => onPreset(name)}
              >
                {name}
              </button>
            )
          })}
        </div>
        {edited ? (
          <span className="edited-flag" aria-live="polite">
            · edited
          </span>
        ) : null}
      </div>

      <label className="controls-name name-field">
        <span className="name-label">effect</span>
        {/* Names the effect in both output files. Kept raw as you type —
            sanitized only where it lands in code — so the field doesn't fight
            the keystroke; an empty box still generates 'mine'. */}
        <input
          type="text"
          className="name-input"
          value={config.name}
          spellCheck={false}
          autoComplete="off"
          maxLength={24}
          placeholder={DEFAULT_NAME}
          onChange={(e) => onName(e.target.value)}
          aria-label="Effect name"
        />
      </label>

      <div className="controls-pipe">
        <span className="tier-tag" aria-hidden="true">
          effects.ts
        </span>

        <section className="pcol" aria-label="Pattern">
          <p className="pcol-head">
            <span className="pcol-name">Pattern</span>
          </p>
          <Segmented
            label="Pattern"
            options={PATTERN_OPTIONS}
            value={stage.pattern}
            onChange={(pattern) => onStage({ pattern })}
          />
        </section>

        <section className="pcol" aria-label="Flow">
          <p className="pcol-head">
            <span className="pcol-name">Flow</span>
            <b className={`pcol-val${stage.flow === 'still' ? ' is-mute' : ''}`}>
              {one(stage.speed)}
            </b>
          </p>
          <Segmented
            label="Flow"
            options={FLOW_OPTIONS}
            value={stage.flow}
            onChange={(flow) => onStage({ flow })}
          />
          <Slider
            label="speed"
            bare
            value={stage.speed}
            min={0}
            max={3}
            step={0.1}
            disabled={stage.flow === 'still'}
            onChange={(speed) => onStage({ speed })}
            format={one}
          />
        </section>

        <section className="pcol" aria-label="Mask">
          <p className="pcol-head">
            <span className="pcol-name">Mask</span>
            <b className={`pcol-val${stage.mask === 'none' ? ' is-mute' : ''}`}>
              {one(stage.falloff)}
            </b>
          </p>
          <Segmented
            label="Mask"
            options={MASK_OPTIONS}
            value={stage.mask}
            onChange={(mask) => onStage({ mask })}
          />
          <Slider
            label="falloff"
            bare
            value={stage.falloff}
            min={0.5}
            max={5}
            step={0.1}
            disabled={stage.mask === 'none'}
            onChange={(falloff) => onStage({ falloff })}
            format={one}
          />
        </section>

        <section className="pcol" aria-label="Shape">
          <p className="pcol-head">
            <span className="pcol-name">Shape</span>
          </p>
          <Slider
            label="turbulence"
            value={stage.turbulence}
            min={0}
            max={3}
            step={0.1}
            onChange={(turbulence) => onStage({ turbulence })}
            format={one}
          />
          <Slider
            label="contrast"
            value={stage.contrast}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(contrast) => onStage({ contrast })}
            format={one}
          />
          <Toggle
            label="Flicker"
            state={stage.flicker ? 'on' : 'steady'}
            on={stage.flicker}
            onChange={(flicker) => onStage({ flicker })}
          />
        </section>
      </div>

      <hr className="controls-rule" />

      <div className="controls-look">
        <span className="tier-tag" aria-hidden="true">
          App.tsx
        </span>

        {/* How the field looks. */}
        <div className="look-group" aria-label="Look">
          <div className="look-cell look-cell-charset">
            <CharsetSelect value={look.charset} onChange={(charset) => onLook({ charset })} />
          </div>
          <div className="look-cell look-cell-accent">
            <AccentSwatches value={look.accent} onChange={(accent) => onLook({ accent })} />
          </div>
          <div className="look-cell">
            <Slider
              label="density"
              unit="px"
              value={look.density}
              min={8}
              max={22}
              step={1}
              onChange={(density) => onLook({ density })}
              format={(v) => v.toFixed(0)}
            />
          </div>
          <div className="look-cell">
            <Slider
              label="persistence"
              value={look.trail}
              min={0}
              max={1}
              step={0.01}
              onChange={(trail) => onLook({ trail })}
              format={(v) => v.toFixed(2)}
            />
          </div>
        </div>

        {/* How the field responds. */}
        <div className="look-group look-responds" aria-label="Pointer">
          <div className="look-cell look-cell-toggle">
            <Toggle
              label="Interaction"
              state={look.pointer ? 'pointer-reactive' : 'ambient only'}
              on={look.pointer}
              onChange={(pointer) => onLook({ pointer })}
            />
          </div>
          <div className="look-cell">
            <Slider
              label="radius"
              unit="px"
              value={look.radius}
              min={40}
              max={360}
              step={1}
              disabled={!look.pointer}
              onChange={(radius) => onLook({ radius })}
              format={(v) => v.toFixed(0)}
            />
          </div>
          <div className="look-cell">
            <Slider
              label="force"
              value={look.force}
              min={0}
              max={3}
              step={0.1}
              disabled={!look.pointer}
              onChange={(force) => onLook({ force })}
              format={one}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
