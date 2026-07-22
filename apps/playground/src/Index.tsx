import { useRef, useState } from 'react'
import { Motes } from '@motes/react'
import { POINTER_ACCENT } from './accent'
import { CATALOG, type CatalogEntry } from './effects'
import { Link, morphFrom } from './router'
import { POINTER_HINT } from './hint'
import { Swap } from './Swap'
import { SiteHeader, SiteFooter } from './Chrome'

export function Index() {
  // The hint has one job and it is done the moment you move. Any move over
  // the hero counts, not just one that lands on the canvas — the copy sits
  // on top of the field, and having moved across it you already know.
  const [touched, setTouched] = useState(false)

  return (
    <main className="index">
      <SiteHeader />

      <header className="hero" onPointerMove={() => setTouched(true)}>
        <Motes
          className="hero-field"
          effect="flow"
          density={12}
          trail={0.35}
          accent={POINTER_ACCENT}
          aria-hidden="true"
        />
        <div className="hero-scrim" aria-hidden="true" />

        <div className="rail">
          {/* No mark here. The bar above carries it now, and at the top of the
              page — the only place the hero's own mark was ever visible — the
              two sat in the same column 124px apart and read as a bug. Put
              `<p className="wordmark">motes</p>` back as the first child to
              restore it. */}
          <div className="hero-copy">
            <h1>The cursor is an input.</h1>

            {/* The thesis, stated as the thing that differs: a second argument. */}
            <p className="signature" aria-label="render of time and pointer">
              <span>render(</span>
              <span className="sig-dim">time</span>
              <span>,&nbsp;</span>
              <span className="sig-hot">pointer</span>
              <span>)</span>
            </p>

            {/* Four sentences at 6, 12, 2 and 12 words. The two-word one is
                doing the work; it only lands because the one before it runs
                long. The version this replaced was three matched clauses of
                roughly equal weight, which is a cadence nobody speaks in. */}
            <p className="lede">
              Procedural ASCII backgrounds for the web. Every other one animates
              from a clock and can’t see your cursor. motes can. Write your own
              effect and the cursor works in it anyway.
            </p>

            {/* One unit: the command and its footnote. Grouped rather than
                left as two siblings so the footnote sits a cell under the
                command instead of a full paragraph break away — at the stack's
                standard gap it reads as another item in the list, not as a
                note about the thing above it. It also arrives as one thing in
                the entrance, which is what it is. */}
            <div className="hero-action">
              <Install />

              {/* Not the badge row reborn. Two facts, placed at the one moment
                  either of them is a live question — while somebody is looking
                  at the command that would install it. MIT is deliberately not
                  here: it is a click away in the repo, and a third fact in a
                  row is how the badge row started. */}
              <p className="hero-meta">zero dependencies · WebGL2</p>
            </div>

            <p
              className={`hero-hint ${touched ? 'is-out' : ''}`}
              aria-hidden={touched}
            >
              {POINTER_HINT}
            </p>
          </div>
        </div>
      </header>

      <section className="grid" aria-label="Effects">
        {CATALOG.map((entry) => (
          <Tile key={entry.id} entry={entry} />
        ))}
      </section>

      <div className="rail">
        <SiteFooter />
      </div>
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
