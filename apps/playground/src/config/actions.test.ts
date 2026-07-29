import { describe, expect, it } from 'vitest'
import type { MotesOptions } from '@lucasmarkes/motes'
import { isSectionDirty, randomize, resetAll, resetSection } from './actions'
import { BASELINE, NUMERIC, NUMERIC_KEYS } from './controls'
import { CHARSETS } from '../controls/CharsetSelect'
import { PRESETS } from '../presets'

describe('resetAll', () => {
  it('returns exactly the baseline', () => {
    const wrecked: MotesOptions = {
      ...BASELINE,
      radius: 300,
      density: 20,
      trail: 0.9,
      background: '#f5f2ea',
    }
    expect(resetAll(wrecked)).toEqual({ ...BASELINE, effect: wrecked.effect })
  })

  it('never changes the effect, because resetting must not navigate', () => {
    const config: MotesOptions = { ...BASELINE, effect: 'waves', radius: 300 }
    expect(resetAll(config).effect).toBe('waves')
  })
})

describe('resetSection', () => {
  it('restores only the named section', () => {
    const config: MotesOptions = { ...BASELINE, radius: 300, density: 20 }
    const next = resetSection(config, 'pointer')
    expect(next.radius).toBe(BASELINE.radius)
    expect(next.density).toBe(20)
  })

  it('restores colours and charset together for the look section', () => {
    const paper = PRESETS[3]
    expect(paper).toBeDefined()
    const config: MotesOptions = { ...BASELINE, ...paper!.values, radius: 300 }
    const next = resetSection(config, 'look')
    expect(next.background).toBe(BASELINE.background)
    expect(next.ink).toBe(BASELINE.ink)
    expect(next.accent).toBe(BASELINE.accent)
    expect(next.radius).toBe(300)
  })
})

describe('isSectionDirty', () => {
  it('is false for a baseline config in every section', () => {
    expect(isSectionDirty(BASELINE, 'pointer')).toBe(false)
    expect(isSectionDirty(BASELINE, 'field')).toBe(false)
    expect(isSectionDirty(BASELINE, 'look')).toBe(false)
  })

  it('reports only the section that actually changed', () => {
    const config: MotesOptions = { ...BASELINE, density: 20 }
    expect(isSectionDirty(config, 'field')).toBe(true)
    expect(isSectionDirty(config, 'pointer')).toBe(false)
    expect(isSectionDirty(config, 'look')).toBe(false)
  })

  it('ignores a changed effect, which no section owns', () => {
    const config: MotesOptions = { ...BASELINE, effect: 'pulse' }
    expect(isSectionDirty(config, 'pointer')).toBe(false)
    expect(isSectionDirty(config, 'field')).toBe(false)
    expect(isSectionDirty(config, 'look')).toBe(false)
  })
})

describe('randomize', () => {
  // A stub RNG makes the roll exact rather than statistical.
  const half = () => 0.5

  it('samples every numeric to the midpoint under a 0.5 RNG', () => {
    const next = randomize(BASELINE, half)
    expect(next.radius).toBe(200)
    expect(next.density).toBe(15)
    expect(next.trail).toBe(0.5)
  })

  it('lands every numeric on its own grid and inside its own bounds', () => {
    let seed = 0
    const walk = () => (seed = (seed + 0.137) % 1)
    for (let i = 0; i < 200; i += 1) {
      const next = randomize(BASELINE, walk)
      for (const key of NUMERIC_KEYS) {
        const c = NUMERIC[key]
        expect(next[key]).toBeGreaterThanOrEqual(c.min)
        expect(next[key]).toBeLessThanOrEqual(c.max)
        expect(next[key]).toBe(quantiseRef(next[key], c.min, c.max, c.step))
      }
    }
  })

  it('never rolls the pointer off, because that is the half of the pitch it demonstrates', () => {
    let seed = 0
    const walk = () => (seed = (seed + 0.137) % 1)
    for (let i = 0; i < 50; i += 1) {
      expect(randomize({ ...BASELINE, pointer: false }, walk).pointer).toBe(true)
    }
  })

  it('takes colour from a preset rather than random hex, so every roll is legible', () => {
    let seed = 0
    const walk = () => (seed = (seed + 0.137) % 1)
    for (let i = 0; i < 50; i += 1) {
      const next = randomize(BASELINE, walk)
      const match = PRESETS.find(
        (p) =>
          p.values.background === next.background &&
          p.values.ink === next.ink &&
          p.values.accent === next.accent,
      )
      expect(match).toBeDefined()
    }
  })

  it('always chooses a charset from the catalogue', () => {
    const next = randomize(BASELINE, half)
    expect(CHARSETS.some((c) => c.value === next.charset)).toBe(true)
  })

  it('never changes the effect', () => {
    expect(randomize({ ...BASELINE, effect: 'waves' }, half).effect).toBe('waves')
  })
})

// Local re-implementation, so the grid assertion above cannot pass by calling
// the same function the implementation used.
function quantiseRef(raw: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((raw - min) / step) * step
  const clamped = Math.min(max, Math.max(min, snapped))
  const decimals = (String(step).split('.')[1] ?? '').length
  return decimals ? parseFloat(clamped.toFixed(decimals)) : clamped
}
