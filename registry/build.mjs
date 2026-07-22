#!/usr/bin/env node
/**
 * Generate the shadcn registry.
 *
 * `shadcn add` needs an absolute URL to fetch an item, and cross-item
 * references (a preset pointing at the base component) have to be absolute
 * too. So a hostname must appear in the *output* — but never in source. It is
 * resolved from the environment at build time (see resolveBase), and every
 * JSON file under the output directory is generated, never hand-edited.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
// Shared with the playground's OG tags, which have the same problem: an
// absolute URL is required in the output and forbidden in the source. One
// ladder, so a preview cannot resolve one of them and not the other.
import { resolveBase, FALLBACK } from '../scripts/base-url.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = join(here, 'src')
const OUT = join(here, '..', 'apps', 'playground', 'public', 'r')

const resolved = resolveBase()

if (resolved.source === 'fallback') {
  console.warn(
    `[registry] no registry URL in the environment; using ${FALLBACK}.\n` +
      `[registry] A deployed build that prints this line has published items ` +
      `pointing at localhost.`,
  )
}

const BASE = resolved.url.replace(/\/+$/, '')
const itemUrl = (name) => `${BASE}/r/${name}.json`

/** Shared by every item: the two packages the components import. */
const NPM_DEPS = ['@lucasmarkes/motes', '@lucasmarkes/motes-react']

const BASE_ITEM = 'motes-background'

const ITEMS = [
  {
    name: BASE_ITEM,
    title: 'Motes Background',
    description:
      'A full-viewport, pointer-reactive ASCII field pinned behind your content.',
    file: 'motes-background.tsx',
    registryDependencies: [],
  },
  {
    name: 'motes-flow-background',
    title: 'Motes Flow Background',
    description:
      'Warm drifting noise. The cursor lights a core and drags a wake behind it.',
    file: 'motes-flow-background.tsx',
    registryDependencies: [itemUrl(BASE_ITEM)],
  },
  {
    name: 'motes-waves-background',
    title: 'Motes Waves Background',
    description: 'Wide interfering sine bands, slowed down and cooled off.',
    file: 'motes-waves-background.tsx',
    registryDependencies: [itemUrl(BASE_ITEM)],
  },
  {
    name: 'motes-pulse-background',
    title: 'Motes Pulse Background',
    description:
      'Dense radial rings with long persistence, for a slow breathing backdrop.',
    file: 'motes-pulse-background.tsx',
    registryDependencies: [itemUrl(BASE_ITEM)],
  },
]

function buildItem(item) {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: item.name,
    type: 'registry:component',
    title: item.title,
    description: item.description,
    dependencies: NPM_DEPS,
    registryDependencies: item.registryDependencies,
    files: [
      {
        path: `components/${item.file}`,
        type: 'registry:component',
        content: readFileSync(join(SRC, item.file), 'utf8'),
      },
    ],
  }
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const built = ITEMS.map(buildItem)

for (const item of built) {
  writeFileSync(join(OUT, `${item.name}.json`), JSON.stringify(item, null, 2) + '\n')
}

// The index, for discovery and `shadcn add` by registry name.
writeFileSync(
  join(OUT, 'registry.json'),
  JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: 'motes',
      homepage: BASE,
      items: built,
    },
    null,
    2,
  ) + '\n',
)

console.log(`[registry] base ${BASE} (from ${resolved.source})`)
for (const item of built) console.log(`[registry]   ${itemUrl(item.name)}`)
