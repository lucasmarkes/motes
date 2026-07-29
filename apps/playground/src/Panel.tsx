import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { MotesOptions } from '@lucasmarkes/motes'
import { CATALOG } from './effects'
import { highlight, snippetFor, type Tab } from './snippet'
import { navigate } from './router'
import { CheckIcon, CopyIcon, DiceIcon, LinkIcon, ResetIcon } from './icons'
import { Swap } from './Swap'
import { Slider } from './controls/Slider'
import { BASELINE, NUMERIC, type Section } from './config/controls'
import { isSectionDirty, randomize, resetAll, resetSection } from './config/actions'
import { CharsetSelect } from './controls/CharsetSelect'
import { Palette } from './controls/Palette'
import { Presets } from './controls/Presets'

interface PanelProps {
  config: MotesOptions
  onChange: (patch: Partial<MotesOptions>) => void
  /** Swaps the whole config at once — what reset and randomize need. */
  onReplace: (next: MotesOptions) => void
  /** Journeys completed. Each increment restages the groups; see below. */
  arrivals: number
}

/** How long one group takes to settle, and how far apart they start. */
const RISE_MS = 260
const RISE_STAGGER = 45

interface EyebrowProps {
  title: string
  section: Section
  config: MotesOptions
  onReplace: (next: MotesOptions) => void
}

/**
 * The section title, and a reset that only exists when there is something to
 * undo. A permanently visible per-section reset would put three dead controls
 * on a panel that opens at its own baseline.
 */
function Eyebrow({ title, section, config, onReplace }: EyebrowProps) {
  const dirty = isSectionDirty(config, section)
  return (
    <p className="eyebrow">
      {title}
      {dirty ? (
        <button
          type="button"
          className="eyebrow-reset"
          aria-label={`Reset ${title}`}
          onClick={() => onReplace(resetSection(config, section))}
        >
          <ResetIcon />
        </button>
      ) : null}
    </p>
  )
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
export function Panel({ config, onChange, onReplace, arrivals }: PanelProps) {
  const [tab, setTab] = useState<Tab>('react')
  const [copied, setCopied] = useState(false)
  const [linked, setLinked] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  /**
   * The groups restage themselves when a journey lands.
   *
   * Randomize moves every control at once, and without this the panel simply
   * holds a new set of numbers — the values have changed but the instrument
   * has not acknowledged anything. Taking the groups in order gives the change
   * a direction to be read in, and makes it obvious that all four were touched
   * rather than the one you happened to be looking at.
   *
   * Driven by the animation API rather than a class, because the whole
   * difficulty here is restarting: a CSS animation does not replay when the
   * attribute that selected it changes, and the usual fixes are a forced
   * reflow or remounting the subtree — which would drop focus out of whatever
   * control the reader was using. `animate()` simply runs again.
   *
   * Skipped entirely, rather than shortened, when the reader has asked for
   * stillness. There is no information in the stagger that is not already in
   * the values, so the honest reduced-motion answer is to not run it.
   */
  useEffect(() => {
    if (arrivals === 0) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const groups = scrollRef.current?.querySelectorAll<HTMLElement>('.group')
    groups?.forEach((group, i) => {
      group.animate(
        [
          { opacity: 0.45, translate: '0 10px' },
          { opacity: 1, translate: '0 0' },
        ],
        {
          duration: RISE_MS,
          delay: i * RISE_STAGGER,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          // Held at the first keyframe through the delay, so a group waiting
          // its turn is already down rather than popping when its turn comes.
          fill: 'backwards',
        },
      )
    })
  }, [arrivals])

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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinked(true)
      window.setTimeout(() => setLinked(false), 1400)
    } catch {
      // Clipboard unavailable; the address bar already holds the same URL.
    }
  }

  return (
    <aside className="panel" aria-label="Field controls">
      {/* Above the scroller, so the actions stay put while the controls move
          under them. Labelled rather than iconographic: Reset survives as a
          glyph, but Randomize is a discovery affordance, and nobody goes
          looking behind an unlabelled die. */}
      <div className="panel-acts" role="group" aria-label="Field actions">
        {/* Wrapped rather than left as bare text: a text node becomes an
            anonymous flex item, and nothing in the stylesheet can reach one to
            trim its line box down to the letters. */}
        <button type="button" onClick={() => onReplace(resetAll(config))}>
          <ResetIcon /> <span className="act-label">Reset</span>
        </button>
        <button type="button" onClick={() => onReplace(randomize(config))}>
          <DiceIcon /> <span className="act-label">Randomize</span>
        </button>
        <button type="button" onClick={copyLink}>
          <LinkIcon /> <Swap on="Copied" off="Link" active={linked} />
        </button>
      </div>

      {/* Only the controls scroll. The snippet stays pinned to the foot of
          the panel, so it never has to be hunted for after a tweak. */}
      <div className="panel-scroll" ref={scrollRef}>
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
          <Eyebrow title="Pointer" section="pointer" config={config} onReplace={onReplace} />

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
            {...NUMERIC.radius}
            value={config.radius}
            baseline={BASELINE.radius}
            disabled={!config.pointer}
            onChange={(radius) => onChange({ radius })}
          />
          <Slider
            {...NUMERIC.force}
            value={config.force}
            baseline={BASELINE.force}
            disabled={!config.pointer}
            onChange={(force) => onChange({ force })}
          />
        </section>

        <section className="group" aria-label="Field">
          <Eyebrow title="Field" section="field" config={config} onReplace={onReplace} />
          <Slider
            {...NUMERIC.density}
            value={config.density}
            baseline={BASELINE.density}
            onChange={(density) => onChange({ density })}
          />
          <Slider
            {...NUMERIC.speed}
            value={config.speed}
            baseline={BASELINE.speed}
            onChange={(speed) => onChange({ speed })}
          />
          <Slider
            {...NUMERIC.contrast}
            value={config.contrast}
            baseline={BASELINE.contrast}
            onChange={(contrast) => onChange({ contrast })}
          />
          <Slider
            {...NUMERIC.brightness}
            value={config.brightness}
            baseline={BASELINE.brightness}
            onChange={(brightness) => onChange({ brightness })}
          />
          <Slider
            {...NUMERIC.trail}
            value={config.trail}
            baseline={BASELINE.trail}
            onChange={(trail) => onChange({ trail })}
          />
        </section>

        <section className="group" aria-label="Look">
          <Eyebrow title="Look" section="look" config={config} onReplace={onReplace} />
          <Presets config={config} onChange={onChange} />
          <CharsetSelect
            value={config.charset}
            onChange={(charset) => onChange({ charset })}
          />
          <Palette
            background={config.background}
            ink={config.ink}
            accent={config.accent}
            onChange={onChange}
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
