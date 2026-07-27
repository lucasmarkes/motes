import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'

export type Tab = 'core' | 'react'

/** Options worth showing: the two that carry the pitch, plus anything tuned. */
const TUNABLE = ['radius', 'force', 'density', 'speed', 'trail', 'charset', 'accent'] as const

export function tuned(config: MotesOptions): Array<[string, string | number]> {
  const out: Array<[string, string | number]> = []
  for (const key of TUNABLE) {
    if (config[key] !== DEFAULT_OPTIONS[key]) out.push([key, config[key]])
  }
  return out
}

const quote = (v: string | number): string =>
  typeof v === 'string' ? `'${v}'` : String(v)

export function coreSnippet(config: MotesOptions): string {
  const extras = tuned(config)
    .map(([k, v]) => `  ${k}: ${quote(v)},\n`)
    .join('')

  return (
    `import { createMotes } from '@lucasmarkes/motes'\n\n` +
    `const field = createMotes(canvas, {\n` +
    `  effect: '${config.effect}',\n` +
    `  pointer: ${config.pointer},\n` +
    extras +
    `})\n\n` +
    `field.start()\n`
  )
}

export function reactSnippet(config: MotesOptions): string {
  const extras = tuned(config)
    .map(([k, v]) =>
      typeof v === 'string' ? `  ${k}="${v}"\n` : `  ${k}={${v}}\n`,
    )
    .join('')

  return (
    `import { Motes } from '@lucasmarkes/motes-react'\n\n` +
    `<Motes\n` +
    `  effect="${config.effect}"\n` +
    (config.pointer ? `  pointer\n` : `  pointer={false}\n`) +
    extras +
    `  className="fixed inset-0 -z-10 h-full w-full pointer-events-none"\n` +
    `/>\n`
  )
}

export function snippetFor(tab: Tab, config: MotesOptions): string {
  return tab === 'core' ? coreSnippet(config) : reactSnippet(config)
}

export type TokenKind = 'keyword' | 'string' | 'number' | 'comment' | 'plain'

export interface Token {
  text: string
  kind: TokenKind
}

const PATTERN =
  /(\/\/[^\n]*)|('[^']*'|"[^"]*")|(\b(?:import|from|const|true|false)\b)|(\b\d+(?:\.\d+)?\b)/g

/** Small tokenizer for the snippet subset — enough to read, nothing more. */
export function highlight(code: string): Token[] {
  const tokens: Token[] = []
  let last = 0

  for (const match of code.matchAll(PATTERN)) {
    const index = match.index
    if (index > last) tokens.push({ text: code.slice(last, index), kind: 'plain' })

    const [text, comment, string, keyword] = match
    tokens.push({
      text,
      kind: comment ? 'comment' : string ? 'string' : keyword ? 'keyword' : 'number',
    })
    last = index + text.length
  }

  if (last < code.length) tokens.push({ text: code.slice(last), kind: 'plain' })
  return tokens
}
