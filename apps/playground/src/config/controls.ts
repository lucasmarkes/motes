import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from '../accent'

/**
 * The playground's origin, which is not the library's.
 *
 * App.tsx has always overridden DEFAULT_OPTIONS.accent with POINTER_ACCENT.
 * Resetting to the library default would hand the page a warm accent it has
 * never rendered, so the origin has to be stated here rather than assumed.
 */
export const BASELINE: MotesOptions = { ...DEFAULT_OPTIONS, accent: POINTER_ACCENT }

export type Section = 'pointer' | 'field' | 'look'

export interface NumericControl {
  section: Section
  label: string
  unit?: string
  min: number
  max: number
  step: number
  format: (v: number) => string
}

/**
 * Every bound the panel used to carry inline, in one place.
 *
 * Panel.tsx still writes each slider by hand and spreads from here, so the
 * grouping and its argument stay legible; what moved is only the numbers,
 * which the codec must clamp against and randomize must sample from.
 */
export const NUMERIC = {
  radius: {
    section: 'pointer',
    label: 'radius',
    unit: 'px',
    min: 40,
    max: 360,
    step: 1,
    format: (v: number) => v.toFixed(0),
  },
  force: {
    section: 'pointer',
    label: 'force',
    min: 0,
    max: 3,
    step: 0.1,
    format: (v: number) => v.toFixed(1),
  },
  density: {
    section: 'field',
    label: 'density',
    unit: 'px',
    min: 8,
    max: 22,
    step: 1,
    format: (v: number) => v.toFixed(0),
  },
  speed: {
    section: 'field',
    label: 'speed',
    min: 0,
    max: 3,
    step: 0.1,
    format: (v: number) => v.toFixed(1),
  },
  contrast: {
    section: 'field',
    label: 'contrast',
    min: 0,
    max: 3,
    step: 0.05,
    format: (v: number) => v.toFixed(2),
  },
  brightness: {
    section: 'field',
    label: 'brightness',
    min: -0.5,
    max: 0.5,
    step: 0.01,
    format: (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)),
  },
  trail: {
    section: 'field',
    label: 'persistence',
    min: 0,
    max: 1,
    step: 0.01,
    format: (v: number) => v.toFixed(2),
  },
} as const satisfies Record<string, NumericControl>

export type NumericKey = keyof typeof NUMERIC

/**
 * Explicit rather than Object.keys, because this order is the URL's order —
 * the same config must always encode to the same string.
 */
export const NUMERIC_KEYS = [
  'radius',
  'force',
  'density',
  'speed',
  'contrast',
  'brightness',
  'trail',
] as const satisfies readonly NumericKey[]

export const COLOR_KEYS = ['background', 'ink', 'accent'] as const

export type TunableKey = NumericKey | 'pointer' | 'charset' | (typeof COLOR_KEYS)[number]

/**
 * Section membership, for per-section reset and the dirty affordance.
 *
 * `effect` is absent because the route owns it: resetting must not navigate.
 * `respectMotionPreference` is absent because it is an accessibility contract,
 * and must never arrive from a link a stranger hands you.
 */
export const SECTION_KEYS: Record<Section, readonly TunableKey[]> = {
  pointer: ['pointer', 'radius', 'force'],
  field: ['density', 'speed', 'contrast', 'brightness', 'trail'],
  look: ['charset', 'background', 'ink', 'accent'],
}

export const SECTIONS = ['pointer', 'field', 'look'] as const satisfies readonly Section[]
