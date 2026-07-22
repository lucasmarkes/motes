import { DEFAULT_ACCENT } from './accents'

/**
 * The only colour on this page.
 *
 * The renderer mixes every cell from a grey ramp toward `accent`, weighted
 * `val * 0.5 + boost * 1.4` (see main.frag). Ambient value alone therefore
 * tops out halfway; only the pointer's boost carries a cell all the way to
 * the accent itself. Feeding it a cool near-white makes the field resolve
 * grey everywhere and leaves the cursor as the one thing on screen with a
 * temperature.
 *
 * This used to be `#d5edff`, described here as `oklch(0.94 0.055 258)` — the
 * same cool axis the neutrals in styles.css sit on. It was neither. Chroma
 * 0.055 is not inside sRGB at that lightness, so the browser clamped it, and
 * what actually shipped was `oklch(0.934 0.035 240.3)`: 18° off the axis this
 * comment claimed it was on, at a chroma the file could not have produced.
 * The number was written as an intention and then never checked against what
 * a display could do with it.
 *
 * So the default is now the cool end of the ramp in accents.ts, which is
 * `oklch(0.933 0.031 258.9)` — measured, in gamut, and on the axis. Against
 * the old value that is a chroma difference of 0.003 and a hue correction;
 * side by side you would not name which is which. The point is that the file
 * now says what it does.
 */
export const POINTER_ACCENT = DEFAULT_ACCENT
