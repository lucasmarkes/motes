import { tuned } from '../snippet'
import { generateField } from './codegen'
import { sanitizeName, type LabConfig } from './pipeline'

export type LabTab = 'effects' | 'app'

/** The one className the docs pin for a full-bleed background field. */
const CLASSNAME = 'fixed inset-0 -z-10 h-full w-full pointer-events-none'

/**
 * The two files a composition becomes: `effects.ts`, which registers the
 * generated field under your name, and `App.tsx`, which imports it and renders
 * `<Motes>`. The field embedded here is the exact string the preview compiled,
 * so what you copy is what you saw.
 */
export function labSource(tab: LabTab, config: LabConfig): string {
  const name = sanitizeName(config.name)
  return tab === 'effects' ? effectsSource(name, config) : appSource(name, config)
}

function effectsSource(name: string, config: LabConfig): string {
  // Indent each line to sit inside the glsl template literal; blank lines stay
  // blank rather than carrying trailing space.
  const field = generateField(config.stage)
    .split('\n')
    .map((line) => (line ? `    ${line}` : ''))
    .join('\n')

  return (
    `import { defineEffect } from '@lucasmarkes/motes'\n\n` +
    `defineEffect('${name}', {\n` +
    '  glsl: `\n' +
    `${field}\n` +
    '  `,\n' +
    `})\n`
  )
}

function appSource(name: string, config: LabConfig): string {
  const { look } = config

  // Only the look values that differ from the defaults, in the same JSX form
  // the effect panel uses — strings quoted, numbers braced.
  const props = tuned({ ...look, effect: name })
    .map(([k, v]) => (typeof v === 'string' ? `      ${k}="${v}"\n` : `      ${k}={${v}}\n`))
    .join('')

  return (
    `import { Motes } from '@lucasmarkes/motes-react'\n` +
    `import './effects'\n\n` +
    `export function App() {\n` +
    `  return (\n` +
    `    <Motes\n` +
    `      effect="${name}"\n` +
    (look.pointer ? `      pointer\n` : `      pointer={false}\n`) +
    props +
    `      className="${CLASSNAME}"\n` +
    `    />\n` +
    `  )\n` +
    `}\n`
  )
}
