import { describe, expect, it } from 'vitest'
import { BASELINE, NUMERIC, NUMERIC_KEYS } from './controls'
import { randomize, resetAll } from './actions'
import { blend, ease, isMoving, mixHex } from './travel'

/** A deterministic stand-in for Math.random, so a rolled config is a fixture
 *  rather than a coin flip. */
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

describe('ease', () => {
  it('starts at the start and ends at the end', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
  })

  it('clamps rather than extrapolating past either end', () => {
    // A frame can land after the deadline; the curve must not overshoot.
    expect(ease(1.4)).toBe(1)
    expect(ease(-0.2)).toBe(0)
  })

  it('leaves fast and settles, which is what makes an arrival read', () => {
    expect(ease(0.25)).toBeGreaterThan(0.25) // ahead early
    expect(ease(0.9)).toBeGreaterThan(0.99) // nearly home well before the end
  })

  it('never goes backwards', () => {
    let prev = -1
    for (let t = 0; t <= 1; t += 0.01) {
      const v = ease(t)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

describe('mixHex', () => {
  it('is its endpoints at its endpoints', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('mixes the channels independently', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#ff0000', '#0000ff', 0.5)).toBe('#800080')
  })

  it('expands a three-digit hex, which the palette is free to produce', () => {
    expect(mixHex('#fff', '#000', 0)).toBe('#ffffff')
    expect(mixHex('#f00', '#00f', 0.5)).toBe('#800080')
  })

  it('always returns something a browser will accept', () => {
    for (let t = 0; t <= 1; t += 0.017) {
      expect(mixHex('#050403', '#f5f2ea', t)).toMatch(/^#[\da-f]{6}$/)
    }
  })

  /** A named colour, a gradient, whatever a future palette allows. Cutting in
   *  the middle of a move is far less noticeable than cutting at either end. */
  it('cuts at the halfway mark for anything it cannot parse', () => {
    expect(mixHex('rebeccapurple', '#fff', 0.4)).toBe('rebeccapurple')
    expect(mixHex('rebeccapurple', '#fff', 0.6)).toBe('#fff')
  })
})

describe('blend', () => {
  const from = BASELINE
  const to = randomize(BASELINE, seeded(7))

  it('is the destination exactly at the end of the journey', () => {
    // Identity, not equality: reset and the clean-URL rule both key off exact
    // values, so the last frame must be the object itself.
    expect(blend(from, to, 1)).toBe(to)
  })

  it('is the origin at the start', () => {
    const at0 = blend(from, to, 0)
    for (const key of NUMERIC_KEYS) expect(at0[key]).toBe(from[key])
  })

  it('lands a reset exactly on the baseline', () => {
    const rolled = randomize(BASELINE, seeded(3))
    const home = resetAll(rolled)
    const landed = blend(rolled, home, 1)
    for (const key of NUMERIC_KEYS) expect(landed[key]).toBe(BASELINE[key])
    expect(landed.background).toBe(BASELINE.background)
  })

  it('never leaves the bounds at any point on the way', () => {
    for (let t = 0; t <= 1; t += 0.01) {
      const at = blend(from, to, ease(t))
      for (const key of NUMERIC_KEYS) {
        const c = NUMERIC[key]
        expect(at[key]).toBeGreaterThanOrEqual(c.min)
        expect(at[key]).toBeLessThanOrEqual(c.max)
      }
    }
  })

  /** An unsnapped aria-valuenow of 153.7724 would be a lie about what the
   *  control can hold. Every frame has to be a value you could stop on. */
  it('reports only values the control could actually be left at', () => {
    for (let t = 0; t <= 1; t += 0.013) {
      const at = blend(from, to, ease(t))
      for (const key of NUMERIC_KEYS) {
        const c = NUMERIC[key]
        const steps = (at[key] - c.min) / c.step
        expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6)
      }
    }
  })

  it('takes the choices from the destination immediately', () => {
    // There is no halfway between one charset and another to show.
    const at = blend(from, { ...to, charset: 'XO', pointer: true }, 0.01)
    expect(at.charset).toBe('XO')
    expect(at.pointer).toBe(true)
  })

  it('moves each number monotonically toward its destination', () => {
    for (const key of NUMERIC_KEYS) {
      const dir = Math.sign(to[key] - from[key])
      if (dir === 0) continue
      let prev = from[key]
      for (let t = 0; t <= 1; t += 0.02) {
        const v = blend(from, to, ease(t))[key]
        expect((v - prev) * dir).toBeGreaterThanOrEqual(0)
        prev = v
      }
    }
  })
})

describe('isMoving', () => {
  it('sees a change in any number', () => {
    expect(isMoving(BASELINE, { ...BASELINE, density: 20 })).toBe(true)
  })

  it('sees a change in any colour', () => {
    expect(isMoving(BASELINE, { ...BASELINE, background: '#fff' })).toBe(true)
  })

  it('is false when there is nothing to show travelling', () => {
    expect(isMoving(BASELINE, { ...BASELINE })).toBe(false)
    // A charset swap is real, but it is a cut — there is nothing to animate,
    // so the journey should be skipped and the value applied at once.
    expect(isMoving(BASELINE, { ...BASELINE, charset: 'XO' })).toBe(false)
  })

  it('is false for a reset that is already home', () => {
    expect(isMoving(BASELINE, resetAll(BASELINE))).toBe(false)
  })
})
