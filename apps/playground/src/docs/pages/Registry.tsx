import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { CodeBlock } from '../CodeBlock'

export function RegistryPage() {
  return (
    <Prose>
      <p className="doc-lede">
        Copy-paste distribution via the shadcn registry — own the code, skip npm if you prefer.
      </p>

      <DocHeading id="install">Install a preset</DocHeading>
      <CodeBlock
        lang="bash"
        code="npx shadcn@latest add https://motes.lucasmarkes.com/r/motes-flow-background.json"
      />

      <DocHeading id="items">Registry items</DocHeading>
      <ul>
        <li>
          <code>motes-background</code> — base full-viewport field
        </li>
        <li>
          <code>motes-flow-background</code> — warm drifting noise, tuned
        </li>
        <li>
          <code>motes-waves-background</code> — wide interfering bands
        </li>
        <li>
          <code>motes-pulse-background</code> — dense radial rings, long persistence
        </li>
      </ul>
      <p>Presets declare the base component as a dependency — installing one pulls both.</p>

      <DocHeading id="usage">Usage</DocHeading>
      <CodeBlock
        lang="tsx"
        code={`import { MotesFlowBackground } from '@/components/motes-flow-background'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MotesFlowBackground />
      {children}
    </>
  )
}`}
      />

      <DocHeading id="custom">Custom options</DocHeading>
      <CodeBlock
        lang="tsx"
        code={`<MotesBackground effect="pulse" pointer radius={200} accent="#3f8ea7" />`}
      />
    </Prose>
  )
}
