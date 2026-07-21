import { useState } from 'react'
import { DEFAULT_OPTIONS, type MotesOptions } from 'motes'
import { POINTER_ACCENT } from './accent'
import { Effect } from './Effect'
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

  const path = usePath()
  const id = path.replace(/^\/+|\/+$/g, '')
  const entry = id ? entryFor(id) : undefined

  if (!entry) return <Index />

  return (
    <Effect
      entry={entry}
      config={{ ...config, effect: entry.id }}
      onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
    />
  )
}
