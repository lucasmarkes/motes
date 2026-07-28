import { describe, expect, it } from 'vitest'
import { parseColorRGBA, parseHexColor, premultiply } from '../color'
import { validateCharset } from '../atlas'
import { DEFAULT_OPTIONS } from '../types'

describe('parseHexColor', () => {
  it('parses six-digit hex', () => {
    expect(parseHexColor('#d8531f', 'accent')).toEqual([216 / 255, 83 / 255, 31 / 255])
  })

  it('expands three-digit shorthand', () => {
    expect(parseHexColor('#f00', 'accent')).toEqual([1, 0, 0])
  })

  it('accepts a missing hash and surrounding space', () => {
    expect(parseHexColor('  ffffff ', 'accent')).toEqual([1, 1, 1])
  })

  it('rejects garbage, naming the accent option', () => {
    expect(() => parseHexColor('rebeccapurple', 'accent')).toThrow(/invalid accent/)
    expect(() => parseHexColor('#12345', 'accent')).toThrow(/invalid accent/)
  })

  it('rejects garbage, naming the ink option', () => {
    expect(() => parseHexColor('rebeccapurple', 'ink')).toThrow(/invalid ink/)
    expect(() => parseHexColor('#12345', 'ink')).toThrow(/invalid ink/)
  })
})

describe('validateCharset', () => {
  it('requires a leading space so index 0 renders empty', () => {
    expect(() => validateCharset('.:-=+')).toThrow(/index 0 must be a space/)
  })

  it('requires at least two characters', () => {
    expect(() => validateCharset(' ')).toThrow(/at least 2/)
  })

  it('accepts the default ramp', () => {
    expect(validateCharset(' .:-=+*#%@')).toBe(' .:-=+*#%@')
  })
})

describe('parseColorRGBA', () => {
  it('parses eight-digit hex with alpha', () => {
    expect(parseColorRGBA('#8040200a')).toEqual([128 / 255, 64 / 255, 32 / 255, 10 / 255])
  })

  it('treats six-digit hex as fully opaque', () => {
    expect(parseColorRGBA('#050403')).toEqual([5 / 255, 4 / 255, 3 / 255, 1])
  })

  it('expands three-digit shorthand, fully opaque', () => {
    expect(parseColorRGBA('#f00')).toEqual([1, 0, 0, 1])
  })

  it('accepts the transparent keyword, case- and space-insensitively', () => {
    expect(parseColorRGBA('transparent')).toEqual([0, 0, 0, 0])
    expect(parseColorRGBA('  TRANSPARENT ')).toEqual([0, 0, 0, 0])
  })

  it('accepts a missing hash', () => {
    expect(parseColorRGBA('ffffffff')).toEqual([1, 1, 1, 1])
  })

  it('rejects garbage', () => {
    expect(() => parseColorRGBA('rebeccapurple')).toThrow(/invalid colou?r/i)
    expect(() => parseColorRGBA('#1234567')).toThrow(/invalid colou?r/i)
  })
})

describe('premultiply', () => {
  it('scales rgb by alpha and keeps alpha', () => {
    expect(premultiply([1, 0.5, 0, 0.5])).toEqual([0.5, 0.25, 0, 0.5])
  })

  it('is the identity at full alpha', () => {
    expect(premultiply([0.2, 0.4, 0.6, 1])).toEqual([0.2, 0.4, 0.6, 1])
  })

  it('collapses a transparent colour to zero', () => {
    expect(premultiply([1, 1, 1, 0])).toEqual([0, 0, 0, 0])
  })
})

describe('DEFAULT_OPTIONS', () => {
  it('defaults the background to the colour the shader used to hardcode', () => {
    expect(DEFAULT_OPTIONS.background).toBe('#050403')
    expect(parseColorRGBA(DEFAULT_OPTIONS.background)).toEqual([5 / 255, 4 / 255, 3 / 255, 1])
  })

  /**
   * #827865 is not a taste decision. It is the solution to "reproduce the old
   * (60 + val*70)/255 ramp with mix(bg, ink, 0.44 + val*0.56)": at val = 1 the
   * ramp reaches ink exactly, so ink must equal the old ramp's bright end,
   * 130 * (1, 0.92, 0.78) = (130, 119.6, 101.4).
   */
  it('defaults ink to the bright end of the old warm-grey ramp', () => {
    expect(DEFAULT_OPTIONS.ink).toBe('#827865')
    const [r, g, b] = parseColorRGBA(DEFAULT_OPTIONS.ink)
    expect(Math.round(r * 255)).toBe(130)
    expect(Math.round(g * 255)).toBe(120) // 119.6 rounded
    expect(Math.round(b * 255)).toBe(101) // 101.4 rounded
  })

  it('defaults the tone curve to a no-op', () => {
    expect(DEFAULT_OPTIONS.contrast).toBe(1)
    expect(DEFAULT_OPTIONS.brightness).toBe(0)
  })

  it('respects the motion preference by default', () => {
    expect(DEFAULT_OPTIONS.respectMotionPreference).toBe(true)
  })
})
