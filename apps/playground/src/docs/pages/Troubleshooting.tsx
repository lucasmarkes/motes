import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { Callout } from '../primitives/Callout'

export function TroubleshootingPage() {
  return (
    <Prose>
      <p className="doc-lede">
        Two CSS traps turn a working renderer into a blank page. In development, motes detects
        each and prints a one-time console warning with the exact fix.
      </p>

      <DocHeading id="tiny">Field sits tiny in a corner</DocHeading>
      <p>
        <code>&lt;canvas&gt;</code> is a replaced element with intrinsic 300×150 size. Pinning
        alone — <code>fixed inset-0</code>, <code>absolute inset-0</code> — does not stretch it:
        with <code>width: auto</code> the inset equation is over-constrained and the intrinsic
        size wins.
      </p>
      <p>
        <strong>Fix:</strong> add <code>h-full w-full</code> (or{' '}
        <code>width: 100%; height: 100%</code>).
      </p>

      <DocHeading id="hidden">Field draws but nothing shows (negative z-index)</DocHeading>
      <p>
        When <code>&lt;html&gt;</code> and <code>&lt;body&gt;</code> both carry a background
        colour, <code>&lt;body&gt;</code>&apos;s stops propagating to the viewport and paints
        above anything at negative z-index.
      </p>
      <p>
        <strong>Fix:</strong> keep the background on exactly one of them, or drop the negative
        z-index and stack content above instead.
      </p>

      <DocHeading id="nested">Nested absolute (not warned)</DocHeading>
      <p>
        An <code>absolute</code> negative-z canvas inside a positioned parent with its own opaque
        background and no stacking context — the parent paints over it. The{' '}
        <code>fixed inset-0</code> snippet is immune.
      </p>
      <p>
        <strong>Fix:</strong> give the parent <code>isolation: isolate</code>, move its
        background elsewhere, or layer content with positive z-index.
      </p>

      <DocHeading id="quiet">Silence warnings</DocHeading>
      <p>
        Deliberate layout? Use <code>data-motes-quiet</code> on the canvas — the React wrapper
        forwards it: <code>&lt;Motes data-motes-quiet … /&gt;</code>.
      </p>

      <Callout kind="note">
        Diagnostics compile out of production builds.
      </Callout>
    </Prose>
  )
}
