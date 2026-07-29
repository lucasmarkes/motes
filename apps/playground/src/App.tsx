import { Docs } from './docs/Docs'
import { Effect } from './Effect'
import { Index } from './Index'
import { entryFor } from './effects'
import { usePath } from './router'
import { useConfig } from './config/useConfig'

export function App() {
  // Held above the route so tuning survives switching between effects — and
  // now mirrored into the URL, so it survives a reload and a paste too.
  const { config, setConfig, replace } = useConfig()

  const path = usePath()

  if (path === '/docs' || path.startsWith('/docs/')) {
    return <Docs path={path} />
  }

  const id = path.replace(/^\/+|\/+$/g, '')
  const entry = id ? entryFor(id) : undefined

  if (!entry) return <Index />

  return (
    <Effect
      entry={entry}
      config={{ ...config, effect: entry.id }}
      onChange={setConfig}
      onReplace={replace}
    />
  )
}
