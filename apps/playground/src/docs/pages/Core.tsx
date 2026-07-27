import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { CodeBlock } from '../CodeBlock'
import { LiveExample } from '../LiveExample'

export function CorePage() {
  return (
    <Prose>
      <p className="doc-lede">
        <code>createMotes(canvas, config)</code> returns an instance you start, tune, and
        destroy. No framework required.
      </p>

      <DocHeading id="create">Create and start</DocHeading>
      <LiveExample tab="core" config={{ effect: 'flow' }} />

      <DocHeading id="instance">Instance API</DocHeading>
      <CodeBlock
        lang="ts"
        code={`const field = createMotes(canvas, { effect: 'waves', pointer: true })

field.start()              // begin RAF loop (idempotent)
field.stop()               // pause, keep GL resources (idempotent)
field.set({ force: 2 })      // live-update any subset
field.getOptions()         // read resolved options
field.destroy()              // full teardown`}
      />

      <DocHeading id="exports">Other exports</DocHeading>
      <ul>
        <li>
          <code>defineEffect(name, &#123; glsl &#125;)</code> — register a custom effect at
          runtime
        </li>
        <li>
          <code>listEffects()</code> — names of all registered effects
        </li>
        <li>
          <code>DEFAULT_OPTIONS</code> — default config object
        </li>
      </ul>
    </Prose>
  )
}
