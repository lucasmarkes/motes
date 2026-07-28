/**
 * Which way the field makes the copy on top of it read.
 *
 * The title block on the effect page sits on the live field with no container
 * — what holds it up is a wash of the field's own background colour. That only
 * works if the type ramp turns at the same moment the wash does, so both
 * decisions come from here.
 */

type RGB = [number, number, number]

export interface FieldTone {
  /** sRGB channels, space separated, for `rgb(var(--field-wash) / a)`. */
  rgb: string
  /** True when dark type reads better on this field than light type. */
  light: boolean
}

/**
 * The page canvas: `--canvas` in styles.css, and what a partly transparent
 * field composites over, because the page is what is actually behind it.
 *
 * Written out rather than imported from DEFAULT_OPTIONS.background so the test
 * that locks the two together is comparing two independent sources.
 */
const CANVAS: RGB = [5, 4, 3]

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Where the two ramps change places.
 *
 * `--text-3` is #80858d and the light ramp's third step is #646971; against a
 * grey background they cross between #767676 (luminance 0.1812) and #777777
 * (0.1845). Measured against the light ramp's own third step, not against
 * `--ink-3` — those are different colours and `--ink-3` is not used here.
 */
const FLIP = 0.183

/** Relative luminance of each ramp's weakest token — the one that fails first. */
const WEAKEST_DARK = 0.2329
const WEAKEST_LIGHT = 0.14

/** AA for the micro type those tokens carry. */
const FLOOR = 4.5

function toLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrast(a: number, b: number): number {
  return a > b ? (a + 0.05) / (b + 0.05) : (b + 0.05) / (a + 0.05)
}

function parse(input: string): RGB {
  const text = input.trim()
  if (text.toLowerCase() === 'transparent') return CANVAS

  const match = HEX.exec(text)
  if (!match) return CANVAS

  const body = match[1]!
  const full =
    body.length === 3
      ? body[0]! + body[0]! + body[1]! + body[1]! + body[2]! + body[2]!
      : body

  const n = parseInt(full.slice(0, 6), 16)
  const rgb: RGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  if (full.length !== 8) return rgb

  const a = parseInt(full.slice(6, 8), 16) / 255
  return [
    Math.round(rgb[0] * a + CANVAS[0] * (1 - a)),
    Math.round(rgb[1] * a + CANVAS[1] * (1 - a)),
    Math.round(rgb[2] * a + CANVAS[2] * (1 - a)),
  ]
}

/**
 * Push the wash toward its own extreme until the weakest token on top of it
 * clears AA — and no further.
 *
 * Every preset returns unchanged, because all five are already extreme. This
 * exists for the mid band a hand-picked colour can land in, where neither ramp
 * works on the raw background: at #777777 the better of the two still leaves
 * the description at 1.62:1. The push is large there — #777777 resolves to a
 * near-white wash — and that is the trade, because the alternative is a
 * description nobody can read.
 */
function nudge(rgb: RGB, light: boolean): RGB {
  const token = light ? WEAKEST_LIGHT : WEAKEST_DARK
  if (contrast(luminance(rgb), token) >= FLOOR) return rgb

  const extreme = light ? 255 : 0
  const mix = (t: number): RGB => [
    Math.round(rgb[0] + (extreme - rgb[0]) * t),
    Math.round(rgb[1] + (extreme - rgb[1]) * t),
    Math.round(rgb[2] + (extreme - rgb[2]) * t),
  ]

  // Luminance is monotonic along the mix and t=1 always clears the floor
  // (5.66:1 at black, 5.52:1 at white), so bisection has a valid upper bound
  // from the start and finds the smallest push that works. Rounding to whole
  // channels can land a hair under, hence the step afterwards.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i += 1) {
    const t = (lo + hi) / 2
    if (contrast(luminance(mix(t)), token) >= FLOOR) hi = t
    else lo = t
  }

  let t = hi
  let out = mix(t)
  while (t < 1 && contrast(luminance(out), token) < FLOOR) {
    t = Math.min(1, t + 0.005)
    out = mix(t)
  }
  return out
}

export function fieldTone(background: string): FieldTone {
  const base = parse(background)
  const light = luminance(base) > FLIP
  const [r, g, b] = nudge(base, light)
  return { rgb: `${r} ${g} ${b}`, light }
}
