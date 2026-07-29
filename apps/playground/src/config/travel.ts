import type { MotesOptions } from '@lucasmarkes/motes'
import { NUMERIC, NUMERIC_KEYS } from './controls'
import { quantise } from './quantise'

/**
 * A config part-way between two others.
 *
 * Reset and randomize swap eight numbers and three colours at once, and doing
 * that in a single frame reads as the panel being replaced rather than
 * adjusted — nothing connects where a value was to where it went. Given a
 * position along the way, this says what the field should be at that moment,
 * so the same two actions can be shown as travel instead.
 *
 * None of it needs a clock or a DOM, which is the point of keeping it here:
 * the properties worth pinning are that a whole journey stays inside the
 * bounds and that its last frame is the destination exactly, and both are
 * plain assertions about a function.
 */

/** Leading `#`, then three or six hex digits — what the presets and the
 *  palette both produce. */
const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i

/** The three channels of a hex colour, or null if it is not one. */
function channels(hex: string): [number, number, number] | null {
  if (!HEX.test(hex)) return null
  const body = hex.slice(1)
  const wide = body.length === 6
  const at = (i: number) => {
    const part = wide ? body.slice(i * 2, i * 2 + 2) : (body[i] ?? '0').repeat(2)
    return Number.parseInt(part, 16)
  }
  return [at(0), at(1), at(2)]
}

const pad = (n: number) => n.toString(16).padStart(2, '0')

/**
 * A colour part-way between two hex colours.
 *
 * Mixed in plain sRGB rather than in a perceptual space. The journey is three
 * hundred milliseconds long and the eye is on the field, not on the ramp; what
 * a better space would buy is a slightly straighter path through the middle
 * frames, which is not worth a colour library on a package that ships with no
 * runtime dependencies at all.
 *
 * Anything that is not a hex colour — a named colour, a gradient, whatever a
 * future palette allows — switches at the halfway mark instead. A hard cut in
 * the middle of a move is far less noticeable than one at either end.
 */
export function mixHex(from: string, to: string, t: number): string {
  const a = channels(from)
  const b = channels(to)
  if (!a || !b) return t < 0.5 ? from : to
  const ch = (i: number) => pad(Math.round((a[i] ?? 0) + ((b[i] ?? 0) - (a[i] ?? 0)) * t))
  return `#${ch(0)}${ch(1)}${ch(2)}`
}

/**
 * Fast away, slow home — cubic ease-out.
 *
 * The click has already happened, so there is nothing left to anticipate and a
 * slow start would only read as lag. Ease-out leaves at speed and settles,
 * which is what makes the arrival legible as an arrival.
 */
export function ease(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return 1 - (1 - clamped) ** 3
}

/** The keys that carry a colour, and so can be mixed. */
const COLOUR_KEYS = ['background', 'ink', 'accent'] as const

/**
 * The config at position `t` along the way from `from` to `to`.
 *
 * Numbers and colours are interpolated; everything else — the effect, the
 * charset, the pointer flag — is taken from the destination immediately. Those
 * are choices rather than quantities, and there is no halfway between one
 * charset and another to show.
 *
 * Each number is snapped to its own step on the way past, so a slider mid-
 * journey still reports a value it could have been left at. An unsnapped
 * `aria-valuenow` of 153.7724 would be a lie about what the control can hold.
 */
export function blend(from: MotesOptions, to: MotesOptions, t: number): MotesOptions {
  if (t >= 1) return to
  const next: MotesOptions = { ...to }

  for (const key of NUMERIC_KEYS) {
    const c = NUMERIC[key]
    const at = from[key] + (to[key] - from[key]) * t
    next[key] = quantise(at, c.min, c.max, c.step)
  }

  for (const key of COLOUR_KEYS) {
    next[key] = mixHex(from[key], to[key], t)
  }

  return next
}

/** Whether there is anything to show travelling. */
export function isMoving(from: MotesOptions, to: MotesOptions): boolean {
  if (NUMERIC_KEYS.some((key) => from[key] !== to[key])) return true
  return COLOUR_KEYS.some((key) => from[key] !== to[key])
}
