import { useRef } from 'react'
import { Motes } from '@lucasmarkes/motes-react'
import { POINTER_ACCENT } from './accent'
import { GALLERY, type CatalogEntry } from './effects'
import { Link, morphFrom } from './router'
import { SiteHeader, SiteFooter } from './Chrome'
import { useReveal } from './reveal'

/**
 * A grid of ready-made effects — live previews, no composer. Each card opens
 * the same effect page the built-ins use: tune it, copy the snippet, leave.
 */
export function Gallery() {
  return (
    <main className="index">
      <SiteHeader />

      <header className="stage-head gallery-head">
        <Link to="/" className="back">
          <span aria-hidden="true">←</span> All effects
        </Link>
        <h1>more</h1>
        <p className="gallery-lede">
          Finished effects registered in the demo. Pick one, tune it, copy the code.
        </p>
      </header>

      <section className="grid" aria-label="More effects">
        {GALLERY.map((entry) => (
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
  const [tile, held] = useReveal<HTMLAnchorElement>()

  return (
    <Link
      ref={tile}
      to={`/${entry.id}`}
      className={`tile ${held ? 'is-held' : ''}`}
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
          <span className="tile-go" aria-hidden="true">
            →
          </span>
        </span>
        <code className={`tile-tag ${entry.custom ? 'is-yours' : ''}`}>{entry.tag}</code>
        <span className="tile-blurb">{entry.blurb}</span>
      </span>
    </Link>
  )
}
