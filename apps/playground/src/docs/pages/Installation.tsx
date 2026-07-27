import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { Callout } from '../primitives/Callout'
import { CodeBlock } from '../CodeBlock'

export function InstallationPage() {
  return (
    <Prose>
      <p className="doc-lede">
        Install the core package for vanilla JS, or add the React wrapper for a drop-in
        component.
      </p>

      <DocHeading id="core">Core</DocHeading>
      <CodeBlock
        lang="bash"
        code={`npm i @lucasmarkes/motes\n# or\npnpm add @lucasmarkes/motes\n# or\nyarn add @lucasmarkes/motes`}
      />

      <DocHeading id="react">React</DocHeading>
      <CodeBlock lang="bash" code="npm i @lucasmarkes/motes-react" />
      <p>
        The React package depends on <code>@lucasmarkes/motes</code> — npm installs both.
      </p>

      <DocHeading id="requirements">Requirements</DocHeading>
      <ul>
        <li>
          <strong>WebGL2</strong> — required by the renderer. Unsupported browsers fail gracefully
          at init.
        </li>
        <li>
          <strong>React 18+</strong> — for <code>@lucasmarkes/motes-react</code> only.
        </li>
        <li>
          <strong>Node 18+</strong> — for local development in this monorepo.
        </li>
      </ul>

      <Callout kind="tip">
        Prefer owning the source? Use the{' '}
        <a href="/docs/registry">shadcn registry</a> to copy-paste background components into
        your project.
      </Callout>
    </Prose>
  )
}
