import { quantise } from '../config/quantise'

/**
 * The geometry a slider draws, and the parsing it accepts.
 *
 * Kept out of the component because none of it needs a DOM to be true, and
 * the interesting cases — a range too fine to tick, a fill that runs the
 * wrong way, a typed value that is not a number — are all reachable from a
 * plain test.
 */

/** Above this many intervals the marks stop being countable and start being
 *  a grey smear, so the track is better off drawn as a continuum. */
const TICK_LIMIT = 20

/**
 * How many intervals to tick, or null when the range is too fine to bother.
 *
 * Rounded before comparing because a fractional step makes the division
 * inexact: (3 - 0) / 0.1 is 29.999999999999996, and a range that is plainly
 * thirty steps should not be decided by the last bit of a double.
 */
export function tickStops(min: number, max: number, step: number): number | null {
  const stops = Math.round((max - min) / step)
  return stops > 0 && stops <= TICK_LIMIT ? stops : null
}

export interface Span {
  /** Percent along the track where the fill begins. */
  start: number
  /** Percent along the track where it ends. */
  end: number
}

/**
 * The fill runs between the baseline and the current value — in whichever
 * order those two fall — rather than from the minimum.
 *
 * A bar drawn from the minimum answers "where does this sit in its range",
 * which is a question nobody tuning a field is asking. Drawn from the origin
 * it answers "how far have I moved it, and which way", and a control that
 * has not been touched correctly draws nothing at all. It is also the same
 * distance-from-baseline the codec encodes and reset restores, so the panel
 * and the URL are finally describing the field the same way.
 */
export function fillSpan(value: number, baseline: number, min: number, max: number): Span {
  const span = max - min
  if (span === 0) return { start: 0, end: 0 }
  const pct = ((value - min) / span) * 100
  const base = ((baseline - min) / span) * 100
  return { start: Math.min(pct, base), end: Math.max(pct, base) }
}

/** Half-width of the well at the origin, in pixels of track. About a thumb. */
const DETENT_PX = 8

/**
 * How much slower the value moves at dead centre. 0 is no well at all; 1 would
 * be a full stop, and a full stop is a trap — the values inside the well would
 * become unreachable by drag.
 */
const DETENT_PULL = 0.8

/**
 * Resistance as the value crosses its origin.
 *
 * Snapping would be the easy version and the wrong one: it makes every value
 * within the well unreachable, and on radius the well is seven units wide.
 * This slows the value instead. Pointer travel maps to value at a fifth speed
 * at the centre and at full speed by the rim, so the origin is easy to find,
 * easy to leave, and nothing between is lost.
 *
 * The curve is `u - k·u(1-u²)²` over the well, in units of half-width. That
 * shape is chosen for its two derivatives: `1-k` at the centre, which is the
 * drag you feel, and exactly 1 at the rim, so the well has no lip — the value
 * neither jumps nor stalls at the moment it enters.
 *
 * @param perPixel value units per pixel of track, which is what sets the
 *   well's width in value terms; a slider's feel should not depend on how
 *   wide its range happens to be.
 */
export function detent(value: number, baseline: number, perPixel: number): number {
  const half = DETENT_PX * perPixel
  if (!(half > 0)) return value
  const u = (value - baseline) / half
  if (Math.abs(u) >= 1) return value
  const bump = u * (1 - u * u) ** 2
  return baseline + half * (u - DETENT_PULL * bump)
}

/** Repeats to absorb before accelerating, so deliberate taps stay exact. */
const RAMP_AFTER = 4
/** Repeats between each extra step of speed. */
const RAMP_EVERY = 4
/** A held key should cross the whole range in about this many repeats —
 *  roughly two seconds at a typical repeat rate. */
const HELD_CROSSING = 60

/**
 * How many steps one keypress is worth, given how long the key has been held.
 *
 * A held arrow used to crawl: radius is three hundred and sixty steps, so
 * reaching an end took twelve seconds of holding. Accelerating fixes that
 * without costing precision, because the first few repeats are still worth
 * one step each — a tap, or a short burst of taps, lands exactly where it did.
 *
 * The ceiling is derived from the range rather than fixed. Density has
 * fourteen steps in total; multiplying anything there would turn a hold into
 * a jump between the bounds, so it never accelerates at all.
 */
export function keyRepeatStep(repeats: number, stops: number): number {
  if (repeats <= RAMP_AFTER) return 1
  const top = Math.max(1, Math.round(stops / HELD_CROSSING))
  const grown = Math.floor((repeats - RAMP_AFTER) / RAMP_EVERY) + 1
  return Math.min(top, grown)
}

/** Leading sign, then digits with an optional point either side of them. */
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)/

/**
 * Reads a typed value, or null if there is no number in it.
 *
 * Clamps and snaps rather than rejecting, on the same principle as the URL
 * decoder: someone who types 9999 into a radius wants the largest radius,
 * and refusing them an answer serves nobody. A trailing unit is ignored,
 * because the readout displays one and typing it back is the obvious thing
 * to do.
 */
export function parseTyped(text: string, min: number, max: number, step: number): number | null {
  const match = NUMBER.exec(text.trim())
  if (!match) return null
  const parsed = Number.parseFloat(match[0])
  if (!Number.isFinite(parsed)) return null
  return quantise(parsed, min, max, step)
}
