import { Prose } from '../primitives/Prose'
import { DocHeading } from '../primitives/DocHeading'
import { CodeBlock } from '../CodeBlock'

export function ApiPage() {
  return (
    <Prose>
      <p className="doc-lede">Complete public API for @lucasmarkes/motes and @lucasmarkes/motes-react.</p>

      <DocHeading id="core-exports">@lucasmarkes/motes</DocHeading>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead>
            <tr>
              <th scope="col">Export</th>
              <th scope="col">Kind</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>createMotes</code>
              </td>
              <td>function</td>
              <td>Create a field on a canvas element</td>
            </tr>
            <tr>
              <td>
                <code>defineEffect</code>
              </td>
              <td>function</td>
              <td>Register a custom GLSL effect</td>
            </tr>
            <tr>
              <td>
                <code>listEffects</code>
              </td>
              <td>function</td>
              <td>List registered effect names</td>
            </tr>
            <tr>
              <td>
                <code>DEFAULT_OPTIONS</code>
              </td>
              <td>const</td>
              <td>Default configuration object</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocHeading id="types">Types</DocHeading>
      <CodeBlock
        lang="ts"
        code={`interface MotesOptions {
  effect: EffectName       // 'flow' | 'waves' | 'pulse' | custom
  pointer: boolean
  radius: number         // CSS px
  force: number
  speed: number
  density: number        // cell size, CSS px
  charset: string        // index 0 must be space
  accent: string         // hex
  trail: number          // 0..1
}

type MotesConfig = Partial<MotesOptions>

interface MotesInstance {
  start(): void
  stop(): void
  set(config: MotesConfig): void
  getOptions(): Readonly<MotesOptions>
  destroy(): void
}

interface EffectDef {
  glsl: string  // must define float field(vec2 cell, float t)
}`}
      />

      <DocHeading id="react-exports">@lucasmarkes/motes-react</DocHeading>
      <CodeBlock
        lang="tsx"
        code={`export const Motes: React.ForwardRefExoticComponent<
  MotesProps & React.RefAttributes<MotesInstance>
>

interface MotesProps extends Partial<MotesOptions>, CanvasHTMLAttributes<HTMLCanvasElement> {}`}
      />
    </Prose>
  )
}
