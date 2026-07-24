import { useEffect, useState } from 'react'
import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from './accent'
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

  // The Lab is its own route, not a catalog entry — it composes effects rather
  // than being one.
  if (id === 'lab') return <Lab />

  if (doorway) return null
  if (!entry) return <Index />

  return (
    <Effect
      entry={entry}
      config={{ ...config, effect: entry.id }}
      onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
    />
  )
}
