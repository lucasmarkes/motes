import { useState } from 'react'
import type { MotesOptions } from '@lucasmarkes/motes'
import { CATALOG } from './effects'
import { snippetFor, type Tab } from './snippet'
import { navigate } from './router'
import { Slider } from './controls/Slider'
import { Segmented } from './controls/Segmented'
import { Toggle } from './controls/Toggle'
import { CharsetSelect } from './controls/CharsetSelect'
import { AccentSwatches } from './controls/AccentSwatches'
import { CodeOutput } from './controls/CodeOutput'

interface PanelProps {
  config: MotesOptions
  onChange: (patch: Partial<MotesOptions>) => void
}

/**
 * Four groups, and the grouping is the argument.
 *
 * These were eight controls in a flat column, spaced identically, so the only
 * way to know that pointer radius belongs to the interaction toggle was to
 * turn the toggle off and notice two things fade. Grouped by what each control
 * does to the field — the pointer, the field itself, how it looks — that fade
 * becomes legible as cause and effect, because the things that dim are the
 * rest of the block the toggle is in.
 */
export function Panel({ config, onChange }: PanelProps) {
  const [tab, setTab] = useState<Tab>('react')

  return (
    <aside className="panel" aria-label="Field controls">
      {/* Only the controls scroll. The snippet stays pinned to the foot of
          the panel, so it never has to be hunted for after a tweak. */}
      <div className="panel-scroll">
        <section className="group" aria-label="Effect">
          <p className="eyebrow">Effect</p>
          <Segmented
            label="Effect"
            options={CATALOG.map((entry) => ({ value: entry.id, label: entry.title }))}
            value={config.effect}
            onChange={(id) => navigate(`/${id}`)}
          />
        </section>

        <section className="group" aria-label="Pointer">
          <p className="eyebrow">Pointer</p>

          {/* The hero control: this flip is the whole pitch. */}
          <Toggle
            label="Interaction"
            state={config.pointer ? 'pointer-reactive' : 'ambient only'}
            on={config.pointer}
            onChange={(pointer) => onChange({ pointer })}
          />

          <Slider
            label="radius"
            unit="px"
            value={config.radius}
            min={40}
            max={360}
            step={1}
            disabled={!config.pointer}
            onChange={(radius) => onChange({ radius })}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="force"
            value={config.force}
            min={0}
            max={3}
            step={0.1}
            disabled={!config.pointer}
            onChange={(force) => onChange({ force })}
            format={(v) => v.toFixed(1)}
          />
        </section>

        <section className="group" aria-label="Field">
          <p className="eyebrow">Field</p>
          <Slider
            label="density"
            unit="px"
            value={config.density}
            min={8}
            max={22}
            step={1}
            onChange={(density) => onChange({ density })}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="speed"
            value={config.speed}
            min={0}
            max={3}
            step={0.1}
            onChange={(speed) => onChange({ speed })}
            format={(v) => v.toFixed(1)}
          />
          <Slider
            label="persistence"
            value={config.trail}
            min={0}
            max={1}
            step={0.01}
            onChange={(trail) => onChange({ trail })}
            format={(v) => v.toFixed(2)}
          />
        </section>

        <section className="group" aria-label="Look">
          <p className="eyebrow">Look</p>
          <CharsetSelect
            value={config.charset}
            onChange={(charset) => onChange({ charset })}
          />
          <AccentSwatches
            value={config.accent}
            onChange={(accent) => onChange({ accent })}
          />
        </section>
      </div>

      <CodeOutput
        tabs={[
          { id: 'react', label: 'React' },
          { id: 'core', label: 'Core' },
        ]}
        active={tab}
        onTab={(id) => setTab(id as Tab)}
        code={snippetFor(tab, config)}
      />
    </aside>
  )
}
