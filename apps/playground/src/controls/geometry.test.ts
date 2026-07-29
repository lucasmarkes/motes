import { describe, expect, it } from 'vitest'
import { NUMERIC, BASELINE, NUMERIC_KEYS } from '../config/controls'
import { detent, fillSpan, keyRepeatStep, parseTyped, tickStops } from './geometry'

describe('tickStops', () => {
  it('counts the stops of a countable range', () => {
    // density: 8..22 by 1 — fifteen positions, fourteen intervals.
    expect(tickStops(8, 22, 1)).toBe(14)
  })

  it('declines ranges too fine to count', () => {
    expect(tickStops(40, 360, 1)).toBeNull() // radius: 320 intervals
    expect(tickStops(-0.5, 0.5, 0.01)).toBeNull() // brightness: 100
  })

  it('survives the float error in a fractional step', () => {
    // (3 - 0) / 0.1 is 29.999999999999996 in binary floating point.
    expect(tickStops(0, 3, 0.1)).toBeNull()
    expect(tickStops(0, 1, 0.1)).toBe(10)
  })

  it('draws ticks on exactly one of the real controls', () => {
    const ticked = NUMERIC_KEYS.filter((key) => {
      const c = NUMERIC[key]
      return tickStops(c.min, c.max, c.step) !== null
    })
    expect(ticked).toEqual(['density'])
  })
})

describe('fillSpan', () => {
  it('runs from the baseline up to a raised value', () => {
    // density 8..22, baseline 13, value 18.
    const span = fillSpan(18, 13, 8, 22)
    expect(span.start).toBeCloseTo(35.7142, 3)
    expect(span.end).toBeCloseTo(71.4285, 3)
  })

  it('runs from a lowered value up to the baseline', () => {
    const span = fillSpan(10, 13, 8, 22)
    expect(span.start).toBeCloseTo(14.2857, 3)
    expect(span.end).toBeCloseTo(35.7142, 3)
  })

  it('collapses to nothing at the baseline', () => {
    const span = fillSpan(13, 13, 8, 22)
    expect(span.start).toBe(span.end)
  })

  it('splits a bipolar range down the middle', () => {
    // brightness sits at zero in -0.5..0.5, so its origin is the centre.
    expect(fillSpan(0, 0, -0.5, 0.5)).toEqual({ start: 50, end: 50 })
    expect(fillSpan(0.25, 0, -0.5, 0.5)).toEqual({ start: 50, end: 75 })
    expect(fillSpan(-0.25, 0, -0.5, 0.5)).toEqual({ start: 25, end: 50 })
  })

  it('keeps every real control inside the track', () => {
    for (const key of NUMERIC_KEYS) {
      const c = NUMERIC[key]
      for (const v of [c.min, c.max, BASELINE[key]]) {
        const span = fillSpan(v, BASELINE[key], c.min, c.max)
        expect(span.start).toBeGreaterThanOrEqual(0)
        expect(span.end).toBeLessThanOrEqual(100)
        expect(span.start).toBeLessThanOrEqual(span.end)
      }
    }
  })
})

describe('parseTyped', () => {
  it('reads a plain number', () => {
    expect(parseTyped('18', 8, 22, 1)).toBe(18)
  })

  it('clamps rather than rejecting an out-of-range number', () => {
    expect(parseTyped('9999', 40, 360, 1)).toBe(360)
    expect(parseTyped('-9999', 40, 360, 1)).toBe(40)
  })

  it('snaps to the step', () => {
    expect(parseTyped('0.237', -0.5, 0.5, 0.01)).toBe(0.24)
    expect(parseTyped('18.6', 8, 22, 1)).toBe(19)
  })

  it('accepts a signed value, which brightness formats and so invites', () => {
    expect(parseTyped('+0.2', -0.5, 0.5, 0.01)).toBe(0.2)
    expect(parseTyped('-0.2', -0.5, 0.5, 0.01)).toBe(-0.2)
  })

  it('ignores a unit the readout itself displays', () => {
    expect(parseTyped('200px', 40, 360, 1)).toBe(200)
    expect(parseTyped(' 200 px ', 40, 360, 1)).toBe(200)
  })

  it('refuses what is not a number at all', () => {
    for (const junk of ['', '   ', 'abc', '--3', '.', 'px', 'NaN', 'Infinity']) {
      expect(parseTyped(junk, 8, 22, 1)).toBeNull()
    }
  })
})

describe('detent', () => {
  // radius: 320 units over a ~320px track, so a unit is about a pixel.
  const perPixel = 1

  it('leaves the value alone outside the well', () => {
    expect(detent(200, 153, perPixel)).toBe(200)
    expect(detent(100, 153, perPixel)).toBe(100)
    // Exactly at the rim, and just outside it.
    expect(detent(161, 153, perPixel)).toBe(161)
    expect(detent(145, 153, perPixel)).toBe(145)
  })

  it('rests on the origin at the origin', () => {
    expect(detent(153, 153, perPixel)).toBe(153)
  })

  it('pulls a nearby value toward the origin without swallowing it', () => {
    const out = detent(155, 153, perPixel)
    expect(out).toBeGreaterThan(153) // still above the origin
    expect(out).toBeLessThan(155) // but held back toward it
  })

  it('is symmetric about the origin', () => {
    const up = detent(153 + 3, 153, perPixel) - 153
    const down = 153 - detent(153 - 3, 153, perPixel)
    expect(up).toBeCloseTo(down, 12)
  })

  /**
   * The property that makes this a detent rather than a trap. A snap would be
   * simpler and would make every value inside the well unreachable by drag.
   */
  it('keeps every value in the well reachable', () => {
    const seen = new Set<number>()
    for (let px = -8; px <= 8; px += 0.05) {
      seen.add(Math.round(detent(153 + px, 153, perPixel)))
    }
    for (let v = 146; v <= 160; v += 1) expect(seen).toContain(v)
  })

  it('rises monotonically, so a rightward drag never moves the value left', () => {
    let prev = Number.NEGATIVE_INFINITY
    for (let px = -12; px <= 12; px += 0.05) {
      const out = detent(153 + px, 153, perPixel)
      expect(out).toBeGreaterThan(prev)
      prev = out
    }
  })

  it('has no lip: the value is continuous across the rim', () => {
    expect(detent(153 + 7.999, 153, perPixel)).toBeCloseTo(160.999, 2)
    expect(detent(153 - 7.999, 153, perPixel)).toBeCloseTo(145.001, 2)
  })

  it('scales the well with the range, so feel does not depend on bounds', () => {
    // force: 3 units over ~320px. The well is 8px either way in both cases,
    // so the same pointer travel is resisted the same amount.
    const wide = detent(153 + 8 * 1 * 0.5, 153, 1) - 153
    const fine = detent(1 + 8 * 0.01 * 0.5, 1, 0.01) - 1
    expect(fine / 0.01).toBeCloseTo(wide / 1, 12)
  })

  it('does nothing when the track has no width to measure against', () => {
    expect(detent(155, 153, 0)).toBe(155)
    expect(detent(155, 153, Number.NaN)).toBe(155)
  })
})

describe('keyRepeatStep', () => {
  // radius has 320 stops; density has 14.
  it('is worth exactly one step for a tap and the first few repeats', () => {
    for (let r = 0; r <= 4; r += 1) expect(keyRepeatStep(r, 320)).toBe(1)
  })

  it('accelerates once the key is plainly being held', () => {
    expect(keyRepeatStep(8, 320)).toBeGreaterThan(1)
    expect(keyRepeatStep(40, 320)).toBeGreaterThan(keyRepeatStep(12, 320))
  })

  it('never accelerates a range too short to need it', () => {
    for (let r = 0; r <= 200; r += 1) expect(keyRepeatStep(r, 14)).toBe(1)
  })

  it('crosses a long range in a couple of seconds of holding', () => {
    let travelled = 0
    let repeats = 0
    while (travelled < 320 && repeats < 500) {
      travelled += keyRepeatStep(repeats, 320)
      repeats += 1
    }
    // A browser repeats about thirty times a second.
    expect(repeats).toBeGreaterThan(30) // not a jump
    expect(repeats).toBeLessThan(120) // not the twelve-second crawl it was
  })

  it('never overshoots its ceiling however long the key is held', () => {
    const top = Math.round(320 / 60)
    for (let r = 0; r <= 1000; r += 1) expect(keyRepeatStep(r, 320)).toBeLessThanOrEqual(top)
  })

  /**
   * Acceleration is only ever allowed to make a control faster than one step
   * per repeat, never faster than a hand can react to. Half a second of
   * holding — about fifteen repeats — is the floor for every real control.
   */
  it('holds every real control to at least half a second across its range', () => {
    for (const key of NUMERIC_KEYS) {
      const { min, max, step } = NUMERIC[key]
      const stops = (max - min) / step
      let travelled = 0
      let repeats = 0
      while (travelled < stops && repeats < 5000) {
        travelled += keyRepeatStep(repeats, stops)
        repeats += 1
      }
      // Never worse than the unaccelerated slider it replaced...
      expect(repeats).toBeLessThanOrEqual(Math.ceil(stops))
      // ...and never a jump. A range shorter than the floor is already fine
      // unaccelerated, and keyRepeatStep leaves those alone.
      expect(repeats).toBeGreaterThanOrEqual(Math.min(15, Math.ceil(stops)))
    }
  })
})
