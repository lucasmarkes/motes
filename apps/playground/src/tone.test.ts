import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from '@lucasmarkes/motes'
import { PRESETS } from './presets'
import { fieldTone } from './tone'

/** The channels of `--canvas` in styles.css, written out independently. */
const CANVAS = '5 4 3'

describe('fieldTone', () => {
  it('reads the four dark presets as dark', () => {
    for (const id of ['void', 'terminal', 'amber']) {
      const preset = PRESETS.find((p) => p.id === id)!
      expect(fieldTone(preset.values.background).light, id).toBe(false)
    }
    expect(fieldTone('transparent').light).toBe(false)
  })

  it('reads Paper as light', () => {
    const paper = PRESETS.find((p) => p.id === 'paper')!
    expect(fieldTone(paper.values.background).light).toBe(true)
  })

  // The promise the whole design rests on: on every preset the wash is the
  // background itself, so the four dark presets look exactly as they do today.
  it('returns every opaque preset background unchanged', () => {
    for (const preset of PRESETS) {
      const hex = preset.values.background
      if (hex === 'transparent') continue
      const n = parseInt(hex.slice(1), 16)
      const expected = `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
      expect(fieldTone(hex).rgb, preset.id).toBe(expected)
    }
  })

  // Asserted in a CSS comment for a year and enforced by nothing until now.
  it('locks the canvas fallback to the library default', () => {
    expect(fieldTone(DEFAULT_OPTIONS.background).rgb).toBe(CANVAS)
  })

  it('composites alpha over the canvas', () => {
    expect(fieldTone('transparent').rgb).toBe(CANVAS)
    expect(fieldTone('#ffffff00').rgb).toBe(CANVAS)
    expect(fieldTone('#ffffffff').rgb).toBe(fieldTone('#ffffff').rgb)
  })

  it('falls back to the canvas on input it cannot read', () => {
    for (const bad of ['nope', '', '#12345']) {
      expect(fieldTone(bad)).toEqual({ rgb: CANVAS, light: false })
    }
  })

  // The measured boundary, not a round number: #767676 sits at luminance
  // 0.1812 and #777777 at 0.1845, and the two ramps' weakest tokens change
  // places between them.
  it('flips at the measured crossover', () => {
    expect(fieldTone('#767676').light).toBe(false)
    expect(fieldTone('#777777').light).toBe(true)
  })

  // Neither ramp works on a raw mid-grey, so the wash is pushed to the
  // extreme far enough for the weakest token to clear AA — 4.51:1 and 4.54:1
  // respectively, measured.
  it('pushes a mid-tone wash until the copy can be read on it', () => {
    expect(fieldTone('#777777').rgb).toBe('232 232 232')
    expect(fieldTone('#767676').rgb).toBe('29 29 29')
  })

  it('expands three-digit hex', () => {
    expect(fieldTone('#abc').rgb).toBe(fieldTone('#aabbcc').rgb)
  })
})
