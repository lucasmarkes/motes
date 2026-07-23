// The Lab pipeline as data.
//
// An effect is a fixed five-stage pipeline with swappable stages — not a node
// graph, not raw GLSL. Every stage is a plain enum or number here; the code
// generator (codegen.ts) turns one of these configs into a `field()` function.
//
//   field(cell, t):
//     1. TURBULENCE — optional domain warp
//     2. PATTERN    — the base texture
//     3. FLOW       — vertical drift over time
//     4. MASK       — anchor the field to an edge, so it reads as a source
//     5. SHAPE      — contrast, and an optional flicker

import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from '../accent'

export type Pattern = 'fbm' | 'bands' | 'lanes' | 'rings'
export type Flow = 'up' | 'down' | 'still'
export type Mask = 'bottom' | 'top' | 'center' | 'none'

export interface StageConfig {
  /** Domain-warp amount, 0..4. 0 disables the stage entirely. */
  turbulence: number
  pattern: Pattern
  flow: Flow
  /** Flow speed. Ignored when flow is 'still'. */
  speed: number
  mask: Mask
  /** Mask falloff exponent. Higher is a harder edge. Ignored when mask is 'none'. */
  falloff: number
  /** Contrast, applied as a gamma curve. */
  contrast: number
  /** Whether the field flickers over time. */
  flicker: boolean
}

export type PresetName = 'fire' | 'rain' | 'aurora' | 'pulse'

// The four presets are just stage configurations — no special-casing anywhere.
// They are the entry point: the Lab loads with `fire` active, and people learn
// the vocabulary by reverse-engineering something that already works.
export const PRESETS: Record<PresetName, StageConfig> = {
  // fbm + flow up + turbulence + mask bottom + contrast + flicker.
  // The mask anchors the noise to the bottom edge; without it, fire is
  // impossible — noise is uniform and never reads as flame.
  fire: {
    turbulence: 1.4,
    pattern: 'fbm',
    flow: 'up',
    speed: 1.4,
    mask: 'bottom',
    falloff: 2.4,
    contrast: 1.5,
    flicker: true,
  },
  // lanes + flow down fast + no mask + high contrast.
  rain: {
    turbulence: 0,
    pattern: 'lanes',
    flow: 'down',
    speed: 2.0,
    mask: 'none',
    falloff: 1,
    contrast: 1.6,
    flicker: false,
  },
  // fbm + flow up slow + heavy turbulence + mask top + soft falloff.
  aurora: {
    turbulence: 2.6,
    pattern: 'fbm',
    flow: 'up',
    speed: 0.4,
    mask: 'top',
    falloff: 1.4,
    contrast: 1.1,
    flicker: false,
  },
  // rings + still + mask center.
  pulse: {
    turbulence: 0,
    pattern: 'rings',
    flow: 'still',
    speed: 1,
    mask: 'center',
    falloff: 1.6,
    contrast: 1.2,
    flicker: false,
  },
}

// The look, minus the effect the composer owns — the field is built from the
// pipeline, never chosen from a list. Everything else motes takes (glyphs,
// colour, the pointer) lives here and updates live, with no recompile.
export type Look = Omit<MotesOptions, 'effect'>

/** The look the Lab opens on: the library's defaults, with this page's cool
 *  accent so the field reads grey and only the cursor carries temperature. */
export const DEFAULT_LOOK: Look = (() => {
  const { effect: _effect, ...rest } = DEFAULT_OPTIONS
  return { ...rest, accent: POINTER_ACCENT }
})()

/** The default name for a composed effect. */
export const DEFAULT_NAME = 'mine'

/** A whole composition: the name, the field's pipeline, and the look around it. */
export interface LabConfig {
  name: string
  stage: StageConfig
  look: Look
}

/** What the Lab opens on with no shared link: fire, the default look, 'mine'. */
export const DEFAULT_CONFIG: LabConfig = {
  name: DEFAULT_NAME,
  stage: PRESETS.fire,
  look: DEFAULT_LOOK,
}

/**
 * Reduce a typed name to something safe to drop into `defineEffect('…')` and
 * `effect="…"` — letters, digits, dash, underscore. Empty (mid-edit, or all
 * stripped) falls back to the default so the generated code always compiles.
 */
export function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24)
  return cleaned || DEFAULT_NAME
}
