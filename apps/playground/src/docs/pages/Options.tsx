import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { OptionsTable } from '../primitives/OptionsTable'
import { LiveExample } from '../LiveExample'

const ROWS = [
  { name: 'effect' as const, description: 'Which field function drives the animation.' },
  { name: 'pointer' as const, description: 'Whether the field reacts to the cursor.' },
  { name: 'radius' as const, description: 'Pointer influence radius, in CSS pixels.' },
  { name: 'force' as const, description: 'Pointer force strength.' },
  { name: 'speed' as const, description: 'Ambient animation speed multiplier.' },
  { name: 'density' as const, description: 'Cell size in CSS pixels. Smaller is denser.' },
  {
    name: 'charset' as const,
    description: 'Dark-to-bright glyph ramp. Index 0 must be a space.',
  },
  { name: 'accent' as const, description: 'Hex color the field intensifies toward.' },
  { name: 'trail' as const, description: 'Phosphor persistence, 0 to 1. 0 is crisp.' },
]

export function OptionsPage() {
  return (
    <Prose>
      <p className="doc-lede">
        Every option is live — call <code>field.set(&#123; force: 2 &#125;)</code> or change a
        React prop. Only changed keys reach the renderer.
      </p>

      <DocHeading id="reference">Reference</DocHeading>
      <OptionsTable rows={ROWS} />

      <DocHeading id="live">Live tuning</DocHeading>
      <p>Drag the controls — the snippet updates to match.</p>
      <LiveExample config={{ effect: 'waves' }} controls />
    </Prose>
  )
}
