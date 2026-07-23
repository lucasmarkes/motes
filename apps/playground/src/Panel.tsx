import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { MotesOptions } from '@lucasmarkes/motes'
import { CATALOG } from './effects'
import { highlight, snippetFor, type Tab } from './snippet'
import { navigate } from './router'
import { CheckIcon, CopyIcon } from './icons'
import { Swap } from './Swap'
import { Slider } from './controls/Slider'
import { CharsetSelect } from './controls/CharsetSelect'
import { AccentSwatches } from './controls/AccentSwatches'

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
  const [copied, setCopied] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  // The underline is one line that slides between two labels of unequal width,
  // so it has to be measured rather than assumed. It rides on transform alone —
  // a 1px base translated to the active tab and scaled to its width — so the
  // slide stays on the GPU and never animates layout. Runs before paint, so the
  // first frame already has it placed; the transition only bites on a change.
  useLayoutEffect(() => {
    const list = tabsRef.current
    const active = list?.querySelector<HTMLElement>('[role="tab"].on')
    if (!list || !active) return
    list.style.setProperty('--u-x', `${active.offsetLeft}px`)
    list.style.setProperty('--u-w', `${active.offsetWidth}`)
  }, [tab])

  const code = snippetFor(tab, config)

  // The active cell's index drives the sliding pill below. Clamped, because a
  // config can carry an effect that is not in the catalog — the pill then rests
  // under the first cell, which is also what the buttons fall back to.
  const activeEffect = Math.max(
    0,
    CATALOG.findIndex((entry) => entry.id === config.effect),
  )

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
        <section className="group" aria-label="Effect">
          <p className="eyebrow">Effect</p>
          <div
            className="seg"
            role="group"
            aria-label="Effect"
            style={
              { '--seg-n': CATALOG.length, '--seg-i': activeEffect } as CSSProperties
            }
          >
            {/* One pill that rides between the cells, behind the labels. */}
            <span className="seg-pill" aria-hidden="true" />
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

        <section className="group" aria-label="Pointer">
          <p className="eyebrow">Pointer</p>

          {/* The hero control: this flip is the whole pitch. */}
          <button
            type="button"
            className={`toggle ${config.pointer ? 'on' : ''}`}
            aria-pressed={config.pointer}
            onClick={() => onChange({ pointer: !config.pointer })}
          >
            <span className="toggle-text">
              <span className="toggle-label">Interaction</span>
              <span className="toggle-state">
                {config.pointer ? 'pointer-reactive' : 'ambient only'}
              </span>
            </span>
            <span className="track" aria-hidden="true">
              <i />
            </span>
          </button>

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

      <section className="code">
        <div className="tabs" role="tablist" aria-label="Code" ref={tabsRef}>
          {(['react', 'core'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              className={t === tab ? 'on' : ''}
              onClick={() => setTab(t)}
            >
              {t === 'react' ? 'React' : 'Core'}
            </button>
          ))}
          <button type="button" className="copy" onClick={copy}>
            <span className="copy-icon" aria-hidden="true">
              <CopyIcon className={copied ? 'is-out' : 'is-in'} />
              <CheckIcon className={copied ? 'is-in' : 'is-out'} />
            </span>
            <Swap on="Copied" off="Copy" active={copied} />
          </button>
          {/* Slides under the active tab; measured in the layout effect above. */}
          <span className="tab-underline" aria-hidden="true" />
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
