import { useRef, useState } from 'react'
import { Motes } from '@motes/react'
import { POINTER_ACCENT } from './accent'
import { CATALOG, type CatalogEntry } from './effects'
import { Link, morphFrom } from './router'
import { POINTER_HINT } from './hint'
import { Swap } from './Swap'

export function Index() {
  return (
    <main className="index">
      <header className="hero">
        <Motes
          className="hero-field"
          effect="flow"
          density={12}
          trail={0.35}
          accent={POINTER_ACCENT}
          aria-hidden="true"
        />
        <div className="hero-scrim" aria-hidden="true" />

        <div className="hero-copy">
          <p className="wordmark">motes</p>
          <h1>The cursor is an input.</h1>

          {/* The thesis, stated as the thing that differs: a second argument. */}
          <p className="signature" aria-label="render of time and pointer">
            <span>render(</span>
            <span className="sig-dim">time</span>
            <span>,&nbsp;</span>
            <span className="sig-hot">pointer</span>
            <span>)</span>
          </p>

          <p className="lede">
            Procedural ASCII backgrounds for the web. Authoring tools bake
            frames and can’t react; procedural galleries animate from time
            alone. motes takes the pointer as a first-class argument, and that
            layer crosses every effect — including the ones you write.
          </p>

          <Install />
        </div>

        <p className="hero-hint">{POINTER_HINT}</p>
      </header>

      <section className="grid" aria-label="Effects">
        {CATALOG.map((entry) => (
          <Tile key={entry.id} entry={entry} />
        ))}
      </section>

      <footer className="foot">
        <span>motes</span>
        <span>MIT</span>
        <span>zero runtime dependencies</span>
        <span>WebGL2</span>
      </footer>
    </main>
  )
}

function Tile({ entry }: { entry: CatalogEntry }) {
  const field = useRef<HTMLSpanElement>(null)

  return (
    <Link
      to={`/${entry.id}`}
      className="tile"
      // This preview is a small-scale render of the very stage being opened,
      // so it grows into it rather than being cut away.
      onActivate={() => morphFrom(field.current)}
    >
      <span className="tile-field" ref={field}>
        <Motes
          effect={entry.id}
          density={10}
          trail={0.3}
          radius={110}
          accent={POINTER_ACCENT}
          aria-hidden="true"
        />
      </span>
      <span className="tile-body">
        <span className="tile-head">
          <span className="tile-name">{entry.title}</span>
          <span className="tile-go" aria-hidden="true">→</span>
        </span>
        <code className={`tile-tag ${entry.custom ? 'is-yours' : ''}`}>
          {entry.tag}
        </code>
        <span className="tile-blurb">{entry.blurb}</span>
      </span>
    </Link>
  )
}

function Install() {
  const [copied, setCopied] = useState(false)
  const command = 'npm i motes'

  return (
    <button
      type="button"
      className="install"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(command)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        } catch {
          // Clipboard unavailable; the command is selectable either way.
        }
      }}
    >
      <span className="prompt" aria-hidden="true">$</span>
      <code>{command}</code>
      <Swap className="install-state" on="copied" off="copy" active={copied} />
    </button>
  )
}
