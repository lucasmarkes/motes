import { useState } from 'react'
import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'
import { Motes } from '@lucasmarkes/motes-react'
import { POINTER_ACCENT } from '../accent'
import { Slider } from '../controls/Slider'
import { CodeBlock } from './CodeBlock'
import { coreSnippet, reactSnippet } from '../snippet'

type LiveTab = 'react' | 'core'

interface LiveExampleProps {
  /** Initial config merged over defaults. */
  config?: Partial<MotesOptions>
  /** Which generated snippet to show. */
  tab?: LiveTab
  /** Show inline tuning controls. */
  controls?: boolean
  /** Fixed height for the preview frame. */
  height?: number
}

export function LiveExample({
  config: initial = {},
  tab = 'react',
  controls = false,
  height = 220,
}: LiveExampleProps) {
  // Where this example opened, kept so its sliders have an origin to draw
  // from. A doc example's baseline is whatever the page chose to show, not
  // the library default — the point of the control is to show the reader how
  // far they have moved the thing in front of them.
  const [origin] = useState<MotesOptions>(() => ({
    ...DEFAULT_OPTIONS,
    accent: POINTER_ACCENT,
    ...initial,
  }))
  const [config, setConfig] = useState<MotesOptions>(origin)

  const snippet = tab === 'react' ? reactSnippet(config) : coreSnippet(config)

  return (
    <figure className="doc-live">
      <div className="doc-live-frame" style={{ height }}>
        <Motes
          className="doc-live-field"
          {...config}
          aria-hidden="true"
        />
        <div className="doc-live-scrim" aria-hidden="true" />
      </div>

      {controls ? (
        <div className="doc-live-controls">
          <Slider
            label="radius"
            unit="px"
            value={config.radius}
            baseline={origin.radius}
            min={40}
            max={280}
            step={10}
            onChange={(radius: number) => setConfig((c) => ({ ...c, radius }))}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="force"
            value={config.force}
            baseline={origin.force}
            min={0.2}
            max={3}
            step={0.1}
            onChange={(force: number) => setConfig((c) => ({ ...c, force }))}
            format={(v) => v.toFixed(1)}
          />
          <Slider
            label="trail"
            value={config.trail}
            baseline={origin.trail}
            min={0}
            max={0.95}
            step={0.05}
            onChange={(trail: number) => setConfig((c) => ({ ...c, trail }))}
            format={(v) => v.toFixed(2)}
          />
        </div>
      ) : null}

      <CodeBlock code={snippet} lang={tab === 'react' ? 'tsx' : 'ts'} />
    </figure>
  )
}
