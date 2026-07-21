import { describe, expect, it } from 'vitest'
import { parseHexColor } from '../color'
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
