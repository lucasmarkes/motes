import { useState } from 'react'
import type { MotesOptions } from 'motes'
import { CATALOG } from './effects'
import { highlight, snippetFor, type Tab } from './snippet'
import { navigate } from './router'

const CHARSETS = [
  { value: ' .:-=+*#%@', label: 'classic' },
  { value: ' .·:+*oO0@', label: 'dots' },
  { value: ' ░▒▓█', label: 'blocks' },
  { value: " .'^\"~=xX", label: 'hairline' },
]

interface PanelProps {
  config: MotesOptions
  onChange: (patch: Partial<MotesOptions>) => void
}

export function Panel({ config, onChange }: PanelProps) {
  const [tab, setTab] = useState<Tab>('react')
  const [copied, setCopied] = useState(false)

  const code = snippetFor(tab, config)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      // Clipboard unavailable; the code is selectable either way.
    }
  }

  return (
    <aside className="panel" aria-label="Field controls">
      {/* Only the controls scroll. The snippet stays pinned to the foot of
          the panel, so it never has to be hunted for after a tweak. */}
      <div className="panel-scroll">
      <section className="panel-block">
        <p className="eyebrow">effect</p>
        <div className="seg" role="group" aria-label="Effect">
          {CATALOG.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === config.effect ? 'on' : ''}
              aria-pressed={entry.id === config.effect}
              onClick={() => navigate(`/${entry.id}`)}
            >
              {entry.title}
            </button>
          ))}
        </div>
      </section>

      {/* The hero control: this flip is the whole pitch. */}
      <section className="panel-block">
        <button
          type="button"
          className={`toggle ${config.pointer ? 'on' : ''}`}
          aria-pressed={config.pointer}
          onClick={() => onChange({ pointer: !config.pointer })}
        >
          <span className="toggle-text">
            <span className="toggle-label">interaction</span>
            <span className="toggle-state">
              {config.pointer ? 'pointer-reactive' : 'ambient only'}
            </span>
          </span>
          <span className="track" aria-hidden="true">
            <i />
          </span>
        </button>
      </section>

      <Slider
        label="pointer radius" unit="px"
        value={config.radius} min={40} max={360} step={1}
        disabled={!config.pointer}
        onChange={(radius) => onChange({ radius })}
        format={(v) => v.toFixed(0)}
      />
      <Slider
        label="pointer force"
        value={config.force} min={0} max={3} step={0.1}
        disabled={!config.pointer}
        onChange={(force) => onChange({ force })}
        format={(v) => v.toFixed(1)}
      />
      <Slider
        label="density" unit="px"
        value={config.density} min={8} max={22} step={1}
        onChange={(density) => onChange({ density })}
        format={(v) => v.toFixed(0)}
      />
      <Slider
        label="speed"
        value={config.speed} min={0} max={3} step={0.1}
        onChange={(speed) => onChange({ speed })}
        format={(v) => v.toFixed(1)}
      />
      <Slider
        label="persistence"
        value={config.trail} min={0} max={1} step={0.01}
        onChange={(trail) => onChange({ trail })}
        format={(v) => v.toFixed(2)}
      />

      <section className="panel-block">
        <label className="eyebrow" htmlFor="charset">charset</label>
        <select
          id="charset"
          value={config.charset}
          onChange={(e) => onChange({ charset: e.target.value })}
        >
          {CHARSETS.map((c) => (
            <option key={c.label} value={c.value}>
              {c.label}   {c.value.trim()}
            </option>
          ))}
        </select>
      </section>

      <section className="panel-block row-inline">
        <label className="eyebrow" htmlFor="accent">accent</label>
        <span className="accent-field">
          <span className="hex">{config.accent}</span>
          <input
            id="accent"
            type="color"
            className="swatch"
            value={config.accent}
            onChange={(e) => onChange({ accent: e.target.value })}
          />
        </span>
      </section>
      </div>

      <section className="code">
        <div className="tabs" role="tablist" aria-label="Code">
          {(['react', 'core'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              className={t === tab ? 'on' : ''}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <button type="button" className="copy" onClick={copy}>
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
        <pre>
          <code>
            {highlight(code).map((token, i) => (
              <span key={i} className={`t-${token.kind}`}>
                {token.text}
              </span>
            ))}
          </code>
        </pre>
      </section>
    </aside>
  )
}

interface SliderProps {
  label: string
  unit?: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (v: number) => void
  format: (v: number) => string
}

function Slider({
  label, unit, value, min, max, step, disabled, onChange, format,
}: SliderProps) {
  const id = `slider-${label.replace(/\s+/g, '-')}`
  return (
    <section className={`panel-block slider ${disabled ? 'is-disabled' : ''}`}>
      <label className="lab" htmlFor={id}>
        <span>{label}</span>
        <b>
          {format(value)}
          {unit ? <em>{unit}</em> : null}
        </b>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </section>
  )
}
