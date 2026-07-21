#!/usr/bin/env node
/**
 * Generate the shadcn registry.
 *
 * `shadcn add` needs an absolute URL to fetch an item, and cross-item
 * references (a preset pointing at the base component) have to be absolute
 * too. So a hostname must appear in the *output* — but never in source.
 * It comes from MOTES_REGISTRY_URL at build time, and every JSON file under
 * the output directory is generated, never hand-edited.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = join(here, 'src')
const OUT = join(here, '..', 'apps', 'playground', 'public', 'r')

const FALLBACK = 'http://localhost:5173'
const raw = process.env.MOTES_REGISTRY_URL?.trim()

if (!raw) {
  console.warn(
    `[registry] MOTES_REGISTRY_URL is not set; using ${FALLBACK}.\n` +
      `[registry] Set it in the deploy environment or the published items ` +
      `will point at localhost.`,
  )
}

const BASE = (raw || FALLBACK).replace(/\/+$/, '')
const itemUrl = (name) => `${BASE}/r/${name}.json`

/** Shared by every item: the two packages the components import. */
const NPM_DEPS = ['motes', '@motes/react']

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

console.log(`[registry] base ${BASE}`)
for (const item of built) console.log(`[registry]   ${itemUrl(item.name)}`)
