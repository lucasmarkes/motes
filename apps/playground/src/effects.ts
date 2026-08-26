import { defineEffect } from '@lucasmarkes/motes'

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
   * The code you would write to get this field. These are peers, not a
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
    id: 'embers',
    tag: 'effect="embers"',
    title: 'embers',
    blurb: 'Heat rising from the bottom edge, dissolving toward the top.',
    detail:
      'Warped fbm dragged upward, hot at the floor. The cursor lights a Gaussian core through the same shared pass — the flame never sees it.',
  },
  {
    id: 'dust',
    tag: 'effect="dust"',
    title: 'dust',
    blurb: 'A sparse nebula of grains, each twinkling on its own clock.',
    detail:
      'An fbm cloud decides where dust exists; a per-cell hash decides which grain. Quiet by design — raise trail to give it weight.',
  },
  {
    id: 'contour',
    tag: 'effect="contour"',
    title: 'contour',
    blurb: 'A drifting relief sliced into level curves.',
    detail:
      'Topographic lines from an fbm height map. Lower density for finer lines; strong on the Paper preset.',
  },
  {
    id: 'moire',
    tag: 'effect="moire"',
    title: 'moire',
    blurb: 'Two ring sources wandering, interfering where they cross.',
    detail:
      'A cousin of pulse with moving centres. The interference pattern never repeats.',
  },
  {
    id: 'aurora',
    tag: 'effect="aurora"',
    title: 'aurora',
    blurb: 'Curtains of light swaying across the upper half.',
    detail:
      'An fbm stretched along y gives the curtains; fine filaments give the texture. Leaves the floor empty on purpose.',
  },
  {
    id: 'ripples',
    tag: 'effect="ripples"',
    title: 'ripples',
    blurb: 'Drops landing at random points, each ring expanding and fading.',
    detail:
      'Four independent drop clocks. Transient by nature: there are seconds when nothing happens, and that is the point.',
  },
  {
    id: 'smoke',
    tag: 'effect="smoke"',
    title: 'smoke',
    blurb: 'A plume rising from the centre, curling and widening as it goes.',
    detail:
      'Domain-warped fbm inside a Gaussian source that widens with height. The cold, slow sibling of embers.',
  },
  {
    id: 'corona',
    tag: 'effect="corona"',
    title: 'corona',
    blurb: 'A dark disc with a turning plasma crown around it.',
    detail:
      'An eclipse. The rim is a sharp exponential line, the crown an fbm in polar coordinates. Built for a centred title.',
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
