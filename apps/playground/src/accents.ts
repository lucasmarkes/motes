/**
 * Five neutrals, white to near-black, as the quick picks for the pointer.
 *
 * A greyscale row, not a palette: these are the choices you reach for without
 * thinking, and the dashed chip beside them opens the picker for everything
 * else. Neutral on purpose — the one chromatic value the page ships is the
 * default in accent.ts, and a coloured swatch row would compete with it. If
 * you want a hue, you say so in the picker.
 */
export interface Accent {
  hex: string
  label: string
}

/** The field's default accent, unchanged by the swatch row above it. The
 *  renderer resolves grey everywhere and mixes only the pointer toward this,
 *  so a cool near-white leaves the cursor as the one thing with a temperature.
 *  See accent.ts for the full rationale. */
const DEFAULT = '#ddeafe'

// Deliberately not annotated `readonly Accent[]`: the annotation would erase
// the tuple and, under `noUncheckedIndexedAccess`, make every index possibly
// undefined at the call site.
export const ACCENTS = [
  { hex: '#ffffff', label: 'white' },
  { hex: '#cfcfcf', label: 'light grey' },
  { hex: '#808080', label: 'mid grey' },
  { hex: '#3f3f3f', label: 'dark grey' },
  { hex: '#111111', label: 'near-black' },
] as const satisfies readonly Accent[]

export const DEFAULT_ACCENT = DEFAULT
