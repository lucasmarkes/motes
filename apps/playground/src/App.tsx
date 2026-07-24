import { useEffect, useRef, useState } from 'react'
import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from './accent'
import { Field, type FieldHandle } from './Field'
import { Effect } from './Effect'
import { Index } from './Index'
import { Lab } from './lab/Lab'
import { entryFor } from './effects'
import { redirect, usePath } from './router'

export function App() {
  // Held above the route so tuning survives switching between effects.
  const [config, setConfig] = useState<MotesOptions>({
    ...DEFAULT_OPTIONS,
    // The library ships a warm accent; this page does not use one.
    accent: POINTER_ACCENT,
  })

  // The one field, created once and kept for the app's lifetime. Every route but
  // the index drives this same instance — the effect pages repoint it through
  // its handle, the Lab borrows it to live-compile into — so navigation morphs
  // the running field in place instead of tearing down a context and building
  // another. The index is the exception: its hero and five tiles are genuinely
  // distinct fields, so it keeps its own canvases and this one is hidden and
  // stopped behind them.
  const fieldRef = useRef<FieldHandle>(null)

  const path = usePath()
  const id = path.replace(/^\/+|\/+$/g, '')

  const entry = id ? entryFor(id) : undefined

  // A custom effect has a tile and a live preview, but no page of its own — its
  // route is a doorway to where the tile leads: the Lab, with its preset loaded.
  // So /rain forwards to /lab rather than standing as a second, staler way to
  // see what the Lab now composes. The hook runs before any early return.
  const doorway = entry?.custom ? entry.href : undefined
  useEffect(() => {
    if (doorway) redirect(doorway)
  }, [doorway])

  // Four routes over one field. The Lab is its own route, not a catalog entry —
  // it composes effects rather than being one; a custom effect's route is a
  // doorway that forwards to the Lab; a catalog entry is an effect page; anything
  // else is the index.
  const route = id === 'lab' ? 'lab' : doorway ? 'redirect' : entry ? 'effect' : 'index'

  // Drive the shared field from the route. The effect pages repoint it and run
  // it; the index hides and stops it; the Lab and the transient redirect leave
  // it exactly as it is — the Lab because its own hook borrows this instance and
  // must not have the effect yanked out from under its live compile, the
  // redirect because it is one render on its way somewhere else. On a Lab→effect
  // return, the Lab's cleanup (a child) repoints to a built-in before this parent
  // effect sets the real one, so the field is never shown bound to a pruned name.
  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    if (route === 'lab' || route === 'redirect') return
    if (route === 'index') {
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
        className={`app-field${route === 'index' ? ' is-index' : ''}`}
        aria-hidden="true"
      />

      {route === 'lab' ? (
        <Lab fieldRef={fieldRef} />
      ) : route === 'redirect' ? null : route === 'effect' ? (
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
