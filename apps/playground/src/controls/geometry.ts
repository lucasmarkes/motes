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
