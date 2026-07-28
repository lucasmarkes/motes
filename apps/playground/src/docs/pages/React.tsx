import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { Callout } from '../primitives/Callout'
import { CodeBlock } from '../CodeBlock'
import { LiveExample } from '../LiveExample'

export function ReactPage() {
  return (
    <Prose>
      <p className="doc-lede">
        <code>&lt;Motes /&gt;</code> is a thin wrapper: a canvas, an instance, and prop diffing.
        It holds no React state — changing a prop updates uniforms without re-rendering your
        tree.
      </p>

      <DocHeading id="usage">Usage</DocHeading>
      <LiveExample tab="react" config={{ effect: 'pulse', trail: 0.5 }} />

      <DocHeading id="props">Props</DocHeading>
      <p>
        Every motes option is a prop: <code>effect</code>, <code>pointer</code>,{' '}
        <code>radius</code>, <code>force</code>, <code>speed</code>, <code>density</code>,{' '}
        <code>charset</code>, <code>accent</code>, <code>background</code>, <code>ink</code>,{' '}
        <code>contrast</code>, <code>brightness</code>, <code>respectMotionPreference</code>,{' '}
        <code>trail</code>.
      </p>
      <p>
        Unknown props — <code>className</code>, <code>style</code>, <code>aria-*</code>,{' '}
        <code>id</code>, event handlers — forward to the canvas.
      </p>

      <DocHeading id="ref">Imperative ref</DocHeading>
      <CodeBlock
        lang="tsx"
        code={`import { useRef } from 'react'
import { Motes } from '@lucasmarkes/motes-react'
import type { MotesInstance } from '@lucasmarkes/motes'

const field = useRef<MotesInstance>(null)

<Motes ref={field} effect="pulse" />

field.current?.stop()
field.current?.set({ trail: 0.8 })`}
      />
      <Callout kind="tip">
        The ref handle is stable and never null once mounted — no mount guard needed.
      </Callout>

      <DocHeading id="quiet">Silencing diagnostics</DocHeading>
      <p>
        Pass <code>data-motes-quiet</code> to silence development layout warnings when your CSS
        is intentional.
      </p>
    </Prose>
  )
}
