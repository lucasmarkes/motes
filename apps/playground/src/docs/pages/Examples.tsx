import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { CodeBlock } from '../CodeBlock'
import { LiveExample } from '../LiveExample'

export function ExamplesPage() {
  return (
    <Prose>
      <p className="doc-lede">Common recipes — copy, adjust, ship.</p>

      <DocHeading id="full-page">Full-page background</DocHeading>
      <CodeBlock
        lang="tsx"
        code={`<Motes
  effect="flow"
  pointer
  className="fixed inset-0 -z-10 h-full w-full pointer-events-none"
/>`}
      />

      <DocHeading id="hero">Hero section</DocHeading>
      <LiveExample config={{ effect: 'flow', density: 12, trail: 0.35 }} height={180} />

      <DocHeading id="effects">Built-in effects</DocHeading>
      <p>Three effects ship with the library. Try each on the playground:</p>
      <ul>
        <li>
          <a href="/flow">flow</a> — domain-warped noise
        </li>
        <li>
          <a href="/waves">waves</a> — layered sine bands
        </li>
        <li>
          <a href="/pulse">pulse</a> — radial rings
        </li>
      </ul>

      <DocHeading id="ambient">Ambient only (no pointer)</DocHeading>
      <LiveExample config={{ effect: 'waves', pointer: false, speed: 0.6 }} height={160} />

      <DocHeading id="dense">Dense charset</DocHeading>
      <CodeBlock
        lang="tsx"
        code={`<Motes
  effect="pulse"
  charset=" .'\`^,:;!|i1l+<>?/\\\\][}{)(*#%&@"
  density={10}
/>`}
      />

      <DocHeading id="motion">Reduced motion</DocHeading>
      <p>
        Respect user preference by not mounting the field, or set <code>speed=0</code> and{' '}
        <code>pointer=&#123;false&#125;</code> for a static frame.
      </p>
    </Prose>
  )
}
