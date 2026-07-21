import { defineEffect } from 'motes'

/**
 * Registered here, in the demo, not in the library — the fourth tile is a real
 * custom effect. It contains no pointer code, and the cursor works anyway.
 */
export const RAIN_GLSL = `float field(vec2 cell, float t) {
  float lane  = fract(sin(cell.x * 91.7) * 4321.0);
  float speed = 0.5 + lane * 1.1;
  float drop  = fract(cell.y * 0.05 - t * speed + lane * 7.0);
  float head  = smoothstep(0.0, 0.05, drop) * pow(1.0 - drop, 5.0);
  return head * (0.55 + lane * 0.45);
}`

defineEffect('rain', { glsl: RAIN_GLSL })

export interface CatalogEntry {
  id: string
  /**
   * The code you would write to get this field. These four are peers, not a
   * sequence, so an ordinal encoded nothing — the identifier does, and it
   * teaches the API on the index page.
   */
  tag: string
  title: string
  /** True for the one effect that is not in the library. */
  custom?: boolean
  blurb: string
  /** Shown on the effect page, under the title. */
  detail: string
}

export const CATALOG: CatalogEntry[] = [
  {
    id: 'flow',
    tag: 'effect="flow"',
    title: 'flow',
    blurb: 'Domain-warped noise drifting on a slow current.',
    detail:
      'Two layers of warped trig noise. The cursor lights a Gaussian core and drags a wake behind it.',
  },
  {
    id: 'waves',
    tag: 'effect="waves"',
    title: 'waves',
    blurb: 'Layered sine bands, phase-shifted by a travelling warp.',
    detail:
      'Three sine axes interfering. Same cursor layer as every other effect, applied after the field resolves.',
  },
  {
    id: 'pulse',
    tag: 'effect="pulse"',
    title: 'pulse',
    blurb: 'Radial rings breathing out from the centre of the grid.',
    detail:
      'Rings decaying with distance. The pointer adds energy locally without touching the ring math.',
  },
  {
    id: 'rain',
    tag: "defineEffect('rain')",
    title: 'yours',
    custom: true,
    blurb: 'Registered at runtime in six lines of GLSL. Not in the library.',
    detail:
      'This effect is not in the library. It was added by this page with defineEffect, and it reacts to the cursor without a line of pointer code.',
  },
]

export function entryFor(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id)
}
