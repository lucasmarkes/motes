import { describe, expect, it } from 'vitest'
import { NUMERIC, BASELINE, NUMERIC_KEYS } from '../config/controls'
import { fillSpan, parseTyped, tickStops } from './geometry'

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
