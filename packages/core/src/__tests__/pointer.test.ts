import { describe, expect, it } from 'vitest'
import {
  createPointerState,
  REFERENCE_DT,
  stepPointer,
  type PointerState,
} from '../renderer/pointer'

/**
 * The prototype's smoothing, verbatim. This is the calibration reference:
 * at 60Hz the shipped implementation must reproduce it exactly.
 */
function prototypeStep(s: PointerState): void {
  const px = s.x
  const py = s.y
  s.x += (s.tx - s.x) * 0.25
  s.y += (s.ty - s.y) * 0.25
  s.vx = s.x - px
  s.vy = s.y - py
  const speed = Math.hypot(s.vx, s.vy)
  s.energy = Math.min(1, s.energy * 0.9 + speed * 0.03)
}

/** Drive a cursor across the field at a constant physical speed (px/second). */
function simulate(
  hz: number,
  seconds: number,
  pxPerSecond: number,
  step: (s: PointerState, dt: number) => void,
): PointerState {
  const dt = 1 / hz
  const s = createPointerState()
  s.active = true
  s.x = 0
  s.y = 0
  s.tx = 0
  s.ty = 0

  const frames = Math.round(seconds * hz)
  for (let i = 1; i <= frames; i++) {
    s.tx = pxPerSecond * (i * dt)
    s.ty = 0
    step(s, dt)
  }
  return s
}

describe('60Hz stays the calibration point', () => {
  it('reproduces the prototype exactly at dt = 1/60', () => {
    const ported = simulate(60, 2, 600, stepPointer)
    const reference = simulate(60, 2, 600, (s) => prototypeStep(s))

    expect(ported.x).toBe(reference.x)
    expect(ported.vx).toBe(reference.vx)
    expect(ported.energy).toBe(reference.energy)
  })

  it('matches the prototype step-for-step, not just at the end', () => {
    const a = createPointerState()
    const b = createPointerState()
    for (const s of [a, b]) {
      s.active = true
      s.x = 10
      s.y = 10
    }

    for (let i = 0; i < 50; i++) {
      const target = 100 + i * 7
      a.tx = target
      a.ty = target * 0.5
      b.tx = target
      b.ty = target * 0.5
      stepPointer(a, REFERENCE_DT)
      prototypeStep(b)
      expect(a.x).toBe(b.x)
      expect(a.energy).toBe(b.energy)
    }
  })
})

describe('the feel is identical across refresh rates', () => {
  const RATES = [30, 60, 90, 120, 144, 240]

  // Slow enough that energy settles below its clamp. At 600px/s the fixed
  // point is 3.0, so min(1, ...) saturates on every rate and the comparisons
  // below would pass without testing anything.
  const SPEED = 30

  it('settles at the same energy regardless of frame rate', () => {
    const results = RATES.map((hz) => simulate(hz, 2, SPEED, stepPointer))
    const reference = results[1]!

    expect(reference.energy).toBeGreaterThan(0.01)
    expect(reference.energy).toBeLessThan(0.99) // not saturated

    for (const r of results) {
      expect(r.energy).toBeCloseTo(reference.energy, 6)
    }
  })

  it('reports velocity in per-60Hz-frame units, so the wake is rate-invariant', () => {
    const results = RATES.map((hz) => simulate(hz, 2, SPEED, stepPointer))
    const reference = results[1]!

    for (const r of results) {
      expect(r.vx).toBeCloseTo(reference.vx, 6)
    }
  })

  it('naive dt scaling would NOT have been enough', () => {
    // Guard the reason the gain is scaled by (1 - decay) rather than by dt:
    // first-order scaling drifts measurably at high refresh rates.
    const naiveStep = (s: PointerState, dt: number): void => {
      const step = dt / REFERENCE_DT
      const px = s.x
      s.x += (s.tx - s.x) * (1 - Math.pow(0.75, step))
      s.vx = (s.x - px) / step
      const speed = Math.abs(s.vx)
      s.energy = Math.min(1, s.energy * Math.pow(0.9, step) + speed * 0.03 * step)
    }

    const naive60 = simulate(60, 2, SPEED, naiveStep)
    const naive240 = simulate(240, 2, SPEED, naiveStep)
    const drift = Math.abs(naive240.energy - naive60.energy) / naive60.energy

    // The naive form drifts by a few percent; the shipped form does not drift.
    expect(drift).toBeGreaterThan(0.02)

    // The shipped form's residual is ~1e-7 relative: floating point plus the
    // bounded lag difference below, three orders off the naive form's drift.
    const real60 = simulate(60, 2, SPEED, stepPointer)
    const real240 = simulate(240, 2, SPEED, stepPointer)
    const realDrift = Math.abs(real240.energy - real60.energy) / real60.energy
    expect(realDrift).toBeLessThan(1e-5)
    expect(realDrift).toBeLessThan(drift / 1000)
  })

  /**
   * Steady-state tracking lag is u/a: v/15 at 60Hz, tending to v/k ≈ v/17.26
   * as dt → 0. Matching the prototype exactly at 60Hz and holding lag exactly
   * constant across rates are mutually exclusive, because the prototype's own
   * lag is an artifact of sampling a moving target at 60Hz. 60Hz is the stated
   * reference, so the exact match wins and this bounds what it costs.
   */
  it('keeps residual tracking-lag drift small and bounded', () => {
    const lagOf = (hz: number): number => {
      const s = simulate(hz, 2, 600, stepPointer)
      return s.tx - s.x
    }

    const at60 = lagOf(60)
    const at120 = lagOf(120)
    const at240 = lagOf(240)

    // Under 8% between the two rates that matter in practice.
    expect(Math.abs(at120 - at60) / at60).toBeLessThan(0.08)
    // Bounded by the continuous limit rather than diverging.
    expect(Math.abs(at240 - at60) / at60).toBeLessThan(0.15)
    // Monotone approach to that limit, not oscillation.
    expect(at120).toBeGreaterThan(at60)
    expect(at240).toBeGreaterThan(at120)
  })

  it('decays idle energy at the same rate regardless of frame rate', () => {
    const decayTo = (hz: number): number => {
      const s = createPointerState()
      s.active = false
      s.energy = 1
      const dt = 1 / hz
      for (let i = 0; i < hz; i++) stepPointer(s, dt) // one second
      return s.energy
    }

    const at60 = decayTo(60)
    expect(decayTo(120)).toBeCloseTo(at60, 9)
    expect(decayTo(240)).toBeCloseTo(at60, 9)
    // Sanity: one second of idling should nearly extinguish it.
    expect(at60).toBeLessThan(0.01)
  })
})

describe('robustness', () => {
  it('clamps a stalled-tab dt instead of teleporting', () => {
    const s = createPointerState()
    s.active = true
    s.x = 0
    s.tx = 1000
    stepPointer(s, 5) // five seconds between frames
    expect(Number.isFinite(s.x)).toBe(true)
    expect(s.x).toBeLessThan(1000)
    expect(s.energy).toBeLessThanOrEqual(1)
  })

  it('never lets energy exceed 1', () => {
    const s = createPointerState()
    s.active = true
    for (let i = 0; i < 200; i++) {
      s.tx += 500
      stepPointer(s, REFERENCE_DT)
    }
    expect(s.energy).toBeLessThanOrEqual(1)
  })
})
