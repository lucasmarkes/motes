import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { LiveExample } from '../LiveExample'
import { CodeBlock } from '../CodeBlock'

export function QuickStartPage() {
  return (
    <Prose>
      <p className="doc-lede">
        A working field in two lines. Sizing comes from CSS — give the canvas a box and motes
        follows it across resizes and DPI changes.
      </p>

      <DocHeading id="react">React</DocHeading>
      <LiveExample tab="react" config={{ effect: 'flow', pointer: true }} />

      <DocHeading id="vanilla">Vanilla</DocHeading>
      <LiveExample tab="core" config={{ effect: 'flow', pointer: true }} />

      <DocHeading id="canvas">Canvas markup</DocHeading>
      <p>
        Pin the field behind your content with <code>fixed inset-0</code> and stretch the canvas
        with explicit dimensions:
      </p>
      <CodeBlock
        lang="tsx"
        code={`<Motes
  effect="flow"
  pointer
  className="fixed inset-0 -z-10 h-full w-full pointer-events-none"
/>`}
      />
      <p>
        Without <code>h-full w-full</code>, the canvas stays at its intrinsic 300×150 size. See{' '}
        <a href="/docs/troubleshooting">Troubleshooting</a>.
      </p>
    </Prose>
  )
}
