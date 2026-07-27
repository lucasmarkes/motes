import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { CodeBlock } from '../CodeBlock'
import { LiveExample } from '../LiveExample'
import { RAIN_GLSL } from '../../effects'

export function CustomEffectsPage() {
  return (
    <Prose>
      <p className="doc-lede">
        An effect is one GLSL function returning 0 to 1. Write it — the cursor works without
        pointer code.
      </p>

      <DocHeading id="define">defineEffect</DocHeading>
      <CodeBlock
        lang="ts"
        code={`import { defineEffect, createMotes } from '@lucasmarkes/motes'

defineEffect('rain', {
  glsl: \`
    float field(vec2 cell, float t) {
      float lane  = fract(sin(cell.x * 91.7) * 4321.0);
      float speed = 0.5 + lane * 1.1;
      float drop  = fract(cell.y * 0.05 - t * speed + lane * 7.0);
      float head  = smoothstep(0.0, 0.05, drop) * pow(1.0 - drop, 5.0);
      return head * (0.55 + lane * 0.45);
    }
  \`,
})

createMotes(canvas, { effect: 'rain', pointer: true }).start()`}
      />

      <DocHeading id="contract">The contract</DocHeading>
      <ul>
        <li>
          Define exactly <code>float field(vec2 cell, float t)</code> returning 0..1
        </li>
        <li>No pointer math — the shared pass handles it</li>
        <li>
          <code>cell</code> is the grid coordinate; <code>t</code> is time in seconds
        </li>
      </ul>

      <DocHeading id="rain">Live: rain</DocHeading>
      <p>This demo registers the rain effect at page load (same as the playground tile).</p>
      <LiveExample config={{ effect: 'rain', density: 10 }} />

      <DocHeading id="source">Full GLSL</DocHeading>
      <CodeBlock lang="glsl" code={RAIN_GLSL} />
    </Prose>
  )
}
