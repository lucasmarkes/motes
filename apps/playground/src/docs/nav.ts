import type { ComponentType } from 'react'
import { IntroductionPage } from './pages/Introduction'
import { InstallationPage } from './pages/Installation'
import { QuickStartPage } from './pages/QuickStart'
import { ConceptsPage } from './pages/Concepts'
import { OptionsPage } from './pages/Options'
import { ReactPage } from './pages/React'
import { CorePage } from './pages/Core'
import { CustomEffectsPage } from './pages/CustomEffects'
import { RegistryPage } from './pages/Registry'
import { TroubleshootingPage } from './pages/Troubleshooting'
import { ApiPage } from './pages/Api'
import { ExamplesPage } from './pages/Examples'

export interface DocHeading {
  id: string
  text: string
  level: 2 | 3
}

export interface DocPage {
  /** URL segment after /docs — empty string for /docs itself. */
  slug: string
  title: string
  description: string
  headings: DocHeading[]
  Component: ComponentType
}

export interface DocGroup {
  title: string
  pages: DocPage[]
}

export const DOC_PAGES: DocPage[] = [
  {
    slug: '',
    title: 'Introduction',
    description: 'What motes is and why render(time, pointer) matters.',
    headings: [
      { id: 'why', text: 'Why motes', level: 2 },
      { id: 'try', text: 'Try it', level: 2 },
      { id: 'packages', text: 'Packages', level: 2 },
    ],
    Component: IntroductionPage,
  },
  {
    slug: 'installation',
    title: 'Installation',
    description: 'Install @lucasmarkes/motes and @lucasmarkes/motes-react.',
    headings: [
      { id: 'core', text: 'Core', level: 2 },
      { id: 'react', text: 'React', level: 2 },
      { id: 'requirements', text: 'Requirements', level: 2 },
    ],
    Component: InstallationPage,
  },
  {
    slug: 'quick-start',
    title: 'Quick start',
    description: 'A working field in React and vanilla JS.',
    headings: [
      { id: 'react', text: 'React', level: 2 },
      { id: 'vanilla', text: 'Vanilla', level: 2 },
      { id: 'canvas', text: 'Canvas markup', level: 2 },
    ],
    Component: QuickStartPage,
  },
  {
    slug: 'concepts',
    title: 'Core concepts',
    description: 'The golden rule, shader assembly, and CSS sizing.',
    headings: [
      { id: 'golden-rule', text: 'The golden rule', level: 2 },
      { id: 'shader', text: 'Shader assembly', level: 2 },
      { id: 'sizing', text: 'Sizing from CSS', level: 2 },
      { id: 'pointer-events', text: 'Pointer events', level: 2 },
    ],
    Component: ConceptsPage,
  },
  {
    slug: 'options',
    title: 'Options',
    description: 'All configuration options with defaults and live tuning.',
    headings: [
      { id: 'reference', text: 'Reference', level: 2 },
      { id: 'live', text: 'Live tuning', level: 2 },
    ],
    Component: OptionsPage,
  },
  {
    slug: 'react',
    title: 'React',
    description: 'The Motes component, props, and imperative ref.',
    headings: [
      { id: 'usage', text: 'Usage', level: 2 },
      { id: 'props', text: 'Props', level: 2 },
      { id: 'ref', text: 'Imperative ref', level: 2 },
      { id: 'quiet', text: 'Silencing diagnostics', level: 2 },
    ],
    Component: ReactPage,
  },
  {
    slug: 'core',
    title: 'Vanilla core',
    description: 'createMotes and the instance API without React.',
    headings: [
      { id: 'create', text: 'Create and start', level: 2 },
      { id: 'instance', text: 'Instance API', level: 2 },
      { id: 'exports', text: 'Other exports', level: 2 },
    ],
    Component: CorePage,
  },
  {
    slug: 'custom-effects',
    title: 'Custom effects',
    description: 'Write GLSL field functions with defineEffect.',
    headings: [
      { id: 'define', text: 'defineEffect', level: 2 },
      { id: 'contract', text: 'The contract', level: 2 },
      { id: 'rain', text: 'Live: rain', level: 2 },
      { id: 'source', text: 'Full GLSL', level: 2 },
    ],
    Component: CustomEffectsPage,
  },
  {
    slug: 'registry',
    title: 'shadcn registry',
    description: 'Copy-paste background components via shadcn.',
    headings: [
      { id: 'install', text: 'Install a preset', level: 2 },
      { id: 'items', text: 'Registry items', level: 2 },
      { id: 'usage', text: 'Usage', level: 2 },
      { id: 'custom', text: 'Custom options', level: 2 },
    ],
    Component: RegistryPage,
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'CSS traps, diagnostics, and data-motes-quiet.',
    headings: [
      { id: 'tiny', text: 'Field sits tiny in a corner', level: 2 },
      { id: 'hidden', text: 'Field draws but nothing shows', level: 2 },
      { id: 'nested', text: 'Nested absolute', level: 2 },
      { id: 'quiet', text: 'Silence warnings', level: 2 },
    ],
    Component: TroubleshootingPage,
  },
  {
    slug: 'api',
    title: 'API reference',
    description: 'Exports, types, and signatures.',
    headings: [
      { id: 'core-exports', text: '@lucasmarkes/motes', level: 2 },
      { id: 'types', text: 'Types', level: 2 },
      { id: 'react-exports', text: '@lucasmarkes/motes-react', level: 2 },
    ],
    Component: ApiPage,
  },
  {
    slug: 'examples',
    title: 'Examples',
    description: 'Recipes for common layouts and effects.',
    headings: [
      { id: 'full-page', text: 'Full-page background', level: 2 },
      { id: 'hero', text: 'Hero section', level: 2 },
      { id: 'effects', text: 'Built-in effects', level: 2 },
      { id: 'ambient', text: 'Ambient only', level: 2 },
      { id: 'dense', text: 'Dense charset', level: 2 },
      { id: 'motion', text: 'Reduced motion', level: 2 },
    ],
    Component: ExamplesPage,
  },
]

export const DOC_GROUPS: DocGroup[] = [
  {
    title: 'Getting started',
    pages: DOC_PAGES.filter((p) =>
      ['', 'installation', 'quick-start'].includes(p.slug),
    ),
  },
  {
    title: 'Guides',
    pages: DOC_PAGES.filter((p) =>
      [
        'concepts',
        'options',
        'react',
        'core',
        'custom-effects',
        'registry',
        'troubleshooting',
      ].includes(p.slug),
    ),
  },
  {
    title: 'Reference',
    pages: DOC_PAGES.filter((p) => ['api', 'examples'].includes(p.slug)),
  },
]

export function pagePath(page: DocPage): string {
  return page.slug ? `/docs/${page.slug}` : '/docs'
}

export function pageForPath(path: string): DocPage | undefined {
  const normalized = path.replace(/\/+$/, '') || '/docs'
  if (normalized === '/docs') return DOC_PAGES.find((p) => p.slug === '')
  if (!normalized.startsWith('/docs/')) return undefined
  const slug = normalized.slice('/docs/'.length)
  return DOC_PAGES.find((p) => p.slug === slug)
}

export function adjacentPages(page: DocPage): {
  prev?: DocPage
  next?: DocPage
} {
  const i = DOC_PAGES.findIndex((p) => p.slug === page.slug)
  return {
    prev: i > 0 ? DOC_PAGES[i - 1] : undefined,
    next: i < DOC_PAGES.length - 1 ? DOC_PAGES[i + 1] : undefined,
  }
}
