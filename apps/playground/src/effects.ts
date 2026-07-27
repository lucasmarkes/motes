import { defineEffect } from '@lucasmarkes/motes'

/**
 * Registered here, in the demo, not in the library — rain is a real custom
 * effect. It contains no pointer code, and the cursor works anyway.
 */
export const RAIN_GLSL = `float field(vec2 cell, float t) {
  float lane  = fract(sin(cell.x * 91.7) * 4321.0);
  float speed = 0.5 + lane * 1.1;
  float drop  = fract(cell.y * 0.05 - t * speed + lane * 7.0);
  float head  = smoothstep(0.0, 0.05, drop) * pow(1.0 - drop, 5.0);
  return head * (0.55 + lane * 0.45);
}`

/** Promoted from the Lab's fire preset — static GLSL, no pipeline at runtime. */
export const FIRE_GLSL = `float field(vec2 cell, float t) {
  // stages: turbulence 2.7 -> fbm -> flow up 1.4 -> mask bottom 1.3 -> contrast 1.2, flicker
  // Nothing below mentions the cursor. The pointer layer is added after
  // field() returns, the same for every effect — you compose only the field.

  vec2 p = cell;

  // SOURCE — bottom: 1 at the source, 0 away from it
  float src = clamp(cell.y / u_grid.y, 0.0, 1.0);

  // FLOW — up at 1.4
  float flow = t * 1.4;

  // TURBULENCE — domain warp, amount 2.7, laminar at the source
  vec2 warp = vec2(
    fbm(p * 0.03 + vec2(t * 0.15, 11.0)),
    fbm(p * 0.03 + vec2(4.0, t * 0.13))
  );
  p += (warp - 0.5) * 5.4 * (1.0 - src);

  // PATTERN — fbm
  float v = fbm(vec2(p.x * 0.11, p.y * 0.06 + flow * 0.12));

  // MASK — bottom, falloff 1.3
  float m = pow(src, 1.3);
  v *= m;

  // SHAPE — contrast 1.2 + flicker
  v = pow(clamp(v, 0.0, 1.0), 1.2);
  v *= 0.6 + 0.4 * valueNoise(vec2(cell.x * 0.30, t * 2.5));

  return v;
}`

/** Promoted from the Lab's aurora preset — static GLSL, no pipeline at runtime. */
export const AURORA_GLSL = `float field(vec2 cell, float t) {
  // stages: turbulence 2.6 -> fbm -> flow up 0.4 -> mask top 1.4 -> contrast 1.1
  // Nothing below mentions the cursor. The pointer layer is added after
  // field() returns, the same for every effect — you compose only the field.

  vec2 p = cell;

  // SOURCE — top: 1 at the source, 0 away from it
  float src = clamp(1.0 - cell.y / u_grid.y, 0.0, 1.0);

  // FLOW — up at 0.4
  float flow = t * 0.4;

  // TURBULENCE — domain warp, amount 2.6, laminar at the source
  vec2 warp = vec2(
    fbm(p * 0.03 + vec2(t * 0.15, 11.0)),
    fbm(p * 0.03 + vec2(4.0, t * 0.13))
  );
  p += (warp - 0.5) * 5.2 * (1.0 - src);

  // PATTERN — fbm
  float v = fbm(vec2(p.x * 0.11, p.y * 0.06 + flow * 0.12));

  // MASK — top, falloff 1.4
  float m = pow(src, 1.4);
  v *= m;

  // SHAPE — contrast 1.1
  v = pow(clamp(v, 0.0, 1.0), 1.1);

  return v;
}`

defineEffect('rain', { glsl: RAIN_GLSL })
defineEffect('fire', { glsl: FIRE_GLSL })
defineEffect('aurora', { glsl: AURORA_GLSL })

export interface CatalogEntry {
  id: string
  /**
   * The code you would write to get this field. These four are peers, not a
   * sequence, so an ordinal encoded nothing — the identifier does, and it
   * teaches the API on the index page.
   */
  tag: string
  title: string
  /** True for effects registered in the demo, not in the library. */
  custom?: boolean
  /** Where the tile leads, when that is not simply `/{id}`. */
  href?: string
  /** Effect name for tile previews when `id` is not an effect (e.g. the gallery door). */
  preview?: string
  blurb: string
  /** Shown on the effect page, under the title. */
  detail: string
}

/** The three built-ins on the home grid, plus the door to the gallery. */
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
    id: 'more',
    tag: 'effect="…"',
    title: 'more',
    href: '/effects',
    preview: 'fire',
    blurb: 'Ready-made effects you can drop in — rain, fire, aurora, and more.',
    detail:
      'A gallery of finished effects registered in the demo. Each one is a live field you can tune and copy.',
  },
]

/** Finished effects in the gallery — each links to its own page at `/{id}`. */
export const GALLERY: CatalogEntry[] = [
  {
    id: 'rain',
    tag: "defineEffect('rain')",
    title: 'rain',
    custom: true,
    blurb: 'Vertical lanes of falling drops, each with its own speed.',
    detail:
      'Registered at runtime in six lines of GLSL. Not in the library — and the cursor works without a line of pointer code.',
  },
  {
    id: 'fire',
    tag: "defineEffect('fire')",
    title: 'fire',
    custom: true,
    blurb: 'Turbulent fbm rising from the bottom edge, with a flickering core.',
    detail:
      'Domain-warped noise anchored to the bottom. Registered in the demo; the pointer layer is applied after the field resolves.',
  },
  {
    id: 'aurora',
    tag: "defineEffect('aurora')",
    title: 'aurora',
    custom: true,
    blurb: 'Slow curtains of noise drifting down from the top edge.',
    detail:
      'Heavy turbulence with a top mask. Registered in the demo; same pointer layer as every other effect.',
  },
  {
    id: 'pulse',
    tag: 'effect="pulse"',
    title: 'pulse',
    blurb: 'Radial rings breathing out from the centre of the grid.',
    detail:
      'Rings decaying with distance. The pointer adds energy locally without touching the ring math.',
  },
]

const ALL_ENTRIES = [...CATALOG.filter((e) => e.id !== 'more'), ...GALLERY]

export function entryFor(id: string): CatalogEntry | undefined {
  if (id === 'effects') {
    return CATALOG.find((e) => e.id === 'more')
  }
  return ALL_ENTRIES.find((e) => e.id === id)
}
