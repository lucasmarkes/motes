/**
 * Six near-whites, warm to cool, for the pointer.
 *
 * A temperature axis, not a palette. Lightness is constant — every value
 * renders between L 0.933 and 0.935, so no swatch is brighter than another
 * and the row changes only what the cursor's core feels like, never how much
 * of the field it lights.
 *
 * Chroma tops out at 0.030 because that is what fits. sRGB's gamut narrows
 * sharply toward white on the blue side: at this lightness the ceiling at hue
 * 258 is 0.0318, against 0.0442 at hue 70. The cool end is what binds the
 * whole ramp, and the warm end is held to the same number so the axis stays
 * symmetric rather than lopsided in the direction the gamut happened to allow.
 *
 * Below about chroma 0.008, 8-bit hex quantisation moves the rendered hue by
 * several degrees — the two inner steps land at 59.6° and 264.5° rather than
 * 70° and 258°. At that chroma the difference is invisible; it is recorded
 * here so the round-trip does not later read as a bug.
 */
export interface Accent {
  hex: string
  label: string
}

/** The cool end, named because accent.ts ships it as the default. */
const COOLEST = '#ddeafe'

// Deliberately not annotated `readonly Accent[]`: the annotation would erase
// the tuple and, under `noUncheckedIndexedAccess`, make every index possibly
// undefined at each of the four call sites.
export const ACCENTS = [
  { hex: '#f7e6d4', label: 'warmest' }, // oklch(0.934 0.030  70)
  { hex: '#f1e7dd', label: 'warmer' }, //  oklch(0.933 0.017  68)
  { hex: '#ece8e5', label: 'warm' }, //    oklch(0.933 0.006  60)
  { hex: '#e7e9ed', label: 'cool' }, //    oklch(0.934 0.006 265)
  { hex: '#e2eaf6', label: 'cooler' }, //  oklch(0.935 0.018 258)
  { hex: COOLEST, label: 'coolest' }, //   oklch(0.933 0.031 259)
] as const satisfies readonly Accent[]

export const DEFAULT_ACCENT = COOLEST
