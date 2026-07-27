import { useEffect, useRef, useState } from 'react'
import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from './accent'
import { Field, type FieldHandle } from './Field'
import { Effect } from './Effect'
import { Gallery } from './Gallery'
import { Index } from './Index'
import { entryFor } from './effects'
import { usePath } from './router'

export function App() {
  // Held above the route so tuning survives switching between effects.
  const [config, setConfig] = useState<MotesOptions>({
    ...DEFAULT_OPTIONS,
    // The library ships a warm accent; this page does not use one.
    accent: POINTER_ACCENT,
  })

  // The one field, created once and kept for the app's lifetime. Every route but
  // the index drives this same instance — the effect pages repoint it through
  // its handle — so navigation morphs the running field in place instead of
  // tearing down a context and building another. The index and gallery are
  // exceptions: their tiles are genuinely distinct fields, so this one is
  // hidden and stopped behind them.
  const fieldRef = useRef<FieldHandle>(null)

  const path = usePath()
  const id = path.replace(/^\/+|\/+$/g, '')

  const entry = id ? entryFor(id) : undefined

  const route =
    id === 'effects'
      ? 'gallery'
      : entry && entry.id !== 'more'
        ? 'effect'
        : 'index'

  // Drive the shared field from the route. The effect pages repoint it and run
  // it; the index and gallery hide and stop it.
  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    if (route === 'index' || route === 'gallery') {
      field.stop()
      return
    }
    field.set({ ...config, effect: entry!.id })
    field.start()
  }, [route, entry, config])

  return (
    <>
      {/* Always mounted, always first, always behind the chrome. `is-index` hides
          it and drops its morph name so the index's own tiles own the transition. */}
      <Field
        ref={fieldRef}
        initial={config}
        className={`app-field${route === 'index' || route === 'gallery' ? ' is-index' : ''}`}
        aria-hidden="true"
      />

      {route === 'gallery' ? (
        <Gallery />
      ) : route === 'effect' ? (
        <Effect
          entry={entry!}
          config={{ ...config, effect: entry!.id }}
          onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
        />
      ) : (
        <Index />
      )}
    </>
  )
}
