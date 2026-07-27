import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { Callout } from '../primitives/Callout'
import { CodeBlock } from '../CodeBlock'

export function ConceptsPage() {
  return (
    <Prose>
      <p className="doc-lede">
        Three ideas explain everything: the golden rule, shader assembly, and CSS-driven sizing.
      </p>

      <DocHeading id="golden-rule">The golden rule</DocHeading>
      <p>
        Pointer interaction is an orthogonal layer that crosses every effect. It is never an
        effect itself. Adding an effect means writing one GLSL <code>field()</code> function —
        the cursor works automatically.
      </p>

      <DocHeading id="shader">Shader assembly</DocHeading>
      <p>The fragment shader is assembled in a fixed order:</p>
      <CodeBlock
        lang="glsl"
        code={`common → your field(vec2 cell, float t) → shared pointer pass → main`}
      />
      <p>
        The pointer contribution is added <em>after</em> <code>field()</code> returns. An effect
        cannot see or override it — orthogonality is structural, not a convention.
      </p>

      <DocHeading id="sizing">Sizing from CSS</DocHeading>
      <p>
        motes reads the canvas element&apos;s CSS box and sets the drawing buffer from{' '}
        <code>devicePixelRatio</code>. You never set <code>width</code> or <code>height</code>{' '}
        attributes — layout is entirely CSS.
      </p>

      <DocHeading id="pointer-events">Pointer events</DocHeading>
      <p>
        Pointer coordinates are read from <code>window</code> and hit-tested against the canvas
        box. A field behind your content can use <code>pointer-events: none</code> — it never
        swallows clicks and still reacts as the cursor crosses stacked elements.
      </p>

      <Callout kind="note">
        Pointer smoothing is frame-rate independent, calibrated so 60Hz reproduces the reference
        exactly.
      </Callout>
    </Prose>
  )
}
