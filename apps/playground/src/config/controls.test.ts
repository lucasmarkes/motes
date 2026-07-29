import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from '@lucasmarkes/motes'
import { BASELINE, NUMERIC, NUMERIC_KEYS, SECTION_KEYS, type NumericKey } from './controls'
import { POINTER_ACCENT } from '../accent'
import { quantise } from './quantise'

describe('quantise', () => {
  it('snaps to the step grid without float drift', () => {
    expect(quantise(0.30000000000000004, 0, 3, 0.1)).toBe(0.3)
    expect(quantise(0.27, 0, 1, 0.05)).toBe(0.25)
  })

  it('clamps to the range', () => {
    expect(quantise(9999, 40, 360, 1)).toBe(360)
    expect(quantise(-9999, 40, 360, 1)).toBe(40)
  })
})

describe('controls schema', () => {
  it('places every numeric baseline inside its own bounds', () => {
    for (const key of NUMERIC_KEYS) {
      const c = NUMERIC[key]
      expect(BASELINE[key]).toBeGreaterThanOrEqual(c.min)
      expect(BASELINE[key]).toBeLessThanOrEqual(c.max)
    }
  })

  it('lists every numeric key exactly once, in NUMERIC_KEYS', () => {
    const declared = Object.keys(NUMERIC) as NumericKey[]
    expect([...NUMERIC_KEYS].sort()).toEqual(declared.sort())
    expect(new Set(NUMERIC_KEYS).size).toBe(NUMERIC_KEYS.length)
  })

  it('assigns every tunable key to exactly one section', () => {
    const all = Object.values(SECTION_KEYS).flat()
    expect(new Set(all).size).toBe(all.length)
    for (const key of NUMERIC_KEYS) expect(all).toContain(key)
    for (const key of ['pointer', 'charset', 'background', 'ink', 'accent']) {
      expect(all).toContain(key)
    }
  })

  it('takes its accent from the playground, not the library', () => {
    // App.tsx overrides DEFAULT_OPTIONS.accent; resetting to the library value
    // would introduce a warm accent this page has never rendered.
    expect(BASELINE.accent).toBe(POINTER_ACCENT)
    expect(BASELINE.accent).not.toBe(DEFAULT_OPTIONS.accent)
  })

  it('excludes effect and respectMotionPreference from every section', () => {
    const all = Object.values(SECTION_KEYS).flat() as string[]
    expect(all).not.toContain('effect')
    expect(all).not.toContain('respectMotionPreference')
  })
})
