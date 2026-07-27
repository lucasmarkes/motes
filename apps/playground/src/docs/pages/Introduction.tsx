import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { LiveExample } from '../LiveExample'

export function IntroductionPage() {
  return (
    <Prose>
      <p className="doc-lede">
        motes renders procedural ASCII backgrounds that react to the cursor in real time.
        Every other library in this space animates from a clock alone — motes takes{' '}
        <code>render(time, pointer)</code>.
      </p>

      <DocHeading id="why">Why motes</DocHeading>
      <p>
        Authoring tools export baked frames — they cannot react at runtime. Procedural
        galleries animate from time alone. motes makes the cursor a first-class input: the
        pointer layer is orthogonal to every effect, so custom GLSL fields inherit
        pointer reactivity without writing pointer code.
      </p>

      <DocHeading id="try">Try it</DocHeading>
      <p>Move your cursor over the field below. The accent intensifies where the pointer passes.</p>
      <LiveExample config={{ effect: 'flow', density: 12, trail: 0.35 }} />

      <DocHeading id="packages">Packages</DocHeading>
      <ul>
        <li>
          <code>@lucasmarkes/motes</code> — core renderer, effects, pointer layer. Zero runtime
          dependencies.
        </li>
        <li>
          <code>@lucasmarkes/motes-react</code> — thin <code>&lt;Motes /&gt;</code> wrapper with
          prop diffing.
        </li>
      </ul>
    </Prose>
  )
}
