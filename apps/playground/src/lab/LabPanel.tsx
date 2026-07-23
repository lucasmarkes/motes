import { useState } from 'react'
import { Slider } from '../controls/Slider'
import { Segmented, type SegOption } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { CharsetSelect } from '../controls/CharsetSelect'
import { AccentSwatches } from '../controls/AccentSwatches'
import { CodeOutput } from '../controls/CodeOutput'
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
import { labSource, type LabTab } from './source'

const PRESET_OPTIONS: readonly SegOption<PresetName>[] = [
  { value: 'fire', label: 'fire' },
  { value: 'rain', label: 'rain' },
  { value: 'aurora', label: 'aurora' },
  { value: 'pulse', label: 'pulse' },
]

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

interface LabPanelProps {
  stage: StageConfig
  /** The preset whose config the stage currently equals, or '' once edited. */
  activePreset: string
  /** Load a preset wholesale — the entry point and the reset. */
  onPreset: (name: PresetName) => void
  /** Patch one field of the pipeline. */
  onStage: (patch: Partial<StageConfig>) => void
  look: Look
  onLook: (patch: Partial<Look>) => void
  /** The full composition, for the two-file output at the foot of the panel. */
  config: LabConfig
  /** The raw name as typed — sanitized only when it reaches the generated code. */
  onName: (name: string) => void
}

const OUTPUT_TABS = [
  { id: 'effects', label: 'effects.ts' },
  { id: 'app', label: 'App.tsx' },
] as const

/**
 * The composer, one group per pipeline stage.
 *
 * It is the effect panel's twin, built from the same controls — `Slider`,
 * `Segmented`, `Toggle`, `CharsetSelect`, `AccentSwatches` — so nothing here is
 * a parallel set. The panel picks an effect from a catalog; this one builds the
 * field from the fixed five stages, then dresses it with the same Look and
 * Pointer groups the panel has. The two read as one instrument in two modes.
 *
 * A preset is a whole `StageConfig`, so its row is the entry point and the way
 * back: loading one is how you start, and it re-selects in the row the moment
 * the pipeline matches it again. Ambient `speed` is deliberately absent — the
 * Flow stage carries the field's motion, and a second global time control
 * beside it would only be a way to fight it.
 */
export function LabPanel({
  stage,
  activePreset,
  onPreset,
  onStage,
  look,
  onLook,
  config,
  onName,
}: LabPanelProps) {
  const [tab, setTab] = useState<LabTab>('effects')

  return (
    <aside className="panel" aria-label="Pipeline controls">
      <div className="panel-scroll">
        <section className="group" aria-label="Preset">
          <p className="eyebrow">Preset</p>
          <Segmented
            label="Preset"
            options={PRESET_OPTIONS}
            value={activePreset}
            onChange={onPreset}
          />
        </section>

        <section className="group" aria-label="Turbulence">
          <p className="eyebrow">Turbulence</p>
          <Slider
            label="warp"
            value={stage.turbulence}
            min={0}
            max={4}
            step={0.1}
            onChange={(turbulence) => onStage({ turbulence })}
            format={(v) => v.toFixed(1)}
          />
        </section>

        <section className="group" aria-label="Pattern">
          <p className="eyebrow">Pattern</p>
          <Segmented
            label="Pattern"
            options={PATTERN_OPTIONS}
            value={stage.pattern}
            onChange={(pattern) => onStage({ pattern })}
          />
        </section>

        <section className="group" aria-label="Flow">
          <p className="eyebrow">Flow</p>
          <Segmented
            label="Flow"
            options={FLOW_OPTIONS}
            value={stage.flow}
            onChange={(flow) => onStage({ flow })}
          />
          <Slider
            label="speed"
            value={stage.speed}
            min={0}
            max={3}
            step={0.1}
            disabled={stage.flow === 'still'}
            onChange={(speed) => onStage({ speed })}
            format={(v) => v.toFixed(1)}
          />
        </section>

        <section className="group" aria-label="Mask">
          <p className="eyebrow">Mask</p>
          <Segmented
            label="Mask"
            options={MASK_OPTIONS}
            value={stage.mask}
            onChange={(mask) => onStage({ mask })}
          />
          <Slider
            label="falloff"
            value={stage.falloff}
            min={0.5}
            max={5}
            step={0.1}
            disabled={stage.mask === 'none'}
            onChange={(falloff) => onStage({ falloff })}
            format={(v) => v.toFixed(1)}
          />
        </section>

        <section className="group" aria-label="Shape">
          <p className="eyebrow">Shape</p>
          <Slider
            label="contrast"
            value={stage.contrast}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(contrast) => onStage({ contrast })}
            format={(v) => v.toFixed(1)}
          />
          <Toggle
            label="Flicker"
            state={stage.flicker ? 'on' : 'steady'}
            on={stage.flicker}
            onChange={(flicker) => onStage({ flicker })}
          />
        </section>

        <section className="group" aria-label="Pointer">
          <p className="eyebrow">Pointer</p>
          <Toggle
            label="Interaction"
            state={look.pointer ? 'pointer-reactive' : 'ambient only'}
            on={look.pointer}
            onChange={(pointer) => onLook({ pointer })}
          />
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
          <Slider
            label="force"
            value={look.force}
            min={0}
            max={3}
            step={0.1}
            disabled={!look.pointer}
            onChange={(force) => onLook({ force })}
            format={(v) => v.toFixed(1)}
          />
        </section>

        <section className="group" aria-label="Look">
          <p className="eyebrow">Look</p>
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
          <Slider
            label="persistence"
            value={look.trail}
            min={0}
            max={1}
            step={0.01}
            onChange={(trail) => onLook({ trail })}
            format={(v) => v.toFixed(2)}
          />
          <CharsetSelect value={look.charset} onChange={(charset) => onLook({ charset })} />
          <AccentSwatches value={look.accent} onChange={(accent) => onLook({ accent })} />
        </section>

        <section className="group" aria-label="Name">
          <p className="eyebrow">Name</p>
          {/* Names the effect in both output files. Kept raw as you type —
              sanitized only where it lands in code — so the field doesn't fight
              the keystroke; an empty box still generates 'mine'. */}
          <label className="name-field">
            <span className="name-label">effect</span>
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
        </section>
      </div>

      <CodeOutput
        tabs={OUTPUT_TABS}
        active={tab}
        onTab={(id) => setTab(id as LabTab)}
        code={labSource(tab, config)}
        label="Output files"
      />
    </aside>
  )
}
