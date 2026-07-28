import { describe, expect, it } from 'vitest'
import { parseColorRGBA, parseHexColor, premultiply } from '../color'
import { validateCharset } from '../atlas'

describe('parseHexColor', () => {
  it('parses six-digit hex', () => {
    expect(parseHexColor('#d8531f')).toEqual([216 / 255, 83 / 255, 31 / 255])
  })

  it('expands three-digit shorthand', () => {
    expect(parseHexColor('#f00')).toEqual([1, 0, 0])
  })

  it('accepts a missing hash and surrounding space', () => {
    expect(parseHexColor('  ffffff ')).toEqual([1, 1, 1])
  })

  it('rejects garbage', () => {
    expect(() => parseHexColor('rebeccapurple')).toThrow(/invalid accent/)
    expect(() => parseHexColor('#12345')).toThrow(/invalid accent/)
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
