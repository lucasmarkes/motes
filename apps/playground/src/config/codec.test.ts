import { describe, expect, it } from 'vitest'
import type { MotesOptions } from '@lucasmarkes/motes'
import { decode, encode } from './codec'
import { BASELINE } from './controls'
import { CHARSETS } from '../controls/CharsetSelect'

describe('encode', () => {
  it('encodes a baseline config to the empty string', () => {
    expect(encode(BASELINE)).toBe('')
  })

  it('emits only the keys that differ from baseline', () => {
    expect(encode({ ...BASELINE, density: 14 })).toBe('density=14')
  })

  it('walks keys in schema order regardless of object key order', () => {
    // 0.5, not the 0.3 the library defaults to — a baseline value would be
    // omitted and the ordering claim would never be exercised.
    const a: MotesOptions = { ...BASELINE, trail: 0.5, radius: 200 }
    const b: MotesOptions = { ...BASELINE, radius: 200, trail: 0.5 }
    expect(encode(a)).toBe(encode(b))
    expect(encode(a)).toBe('radius=200&trail=0.5')
  })

  it('prints numbers at their step precision, never float drift', () => {
    expect(encode({ ...BASELINE, force: 0.30000000000000004 })).toBe('force=0.3')
  })

  it('drops the hash from colours so links stay readable', () => {
    expect(encode({ ...BASELINE, background: '#101010' })).toBe('background=101010')
  })

  it('encodes transparent as a word', () => {
    expect(encode({ ...BASELINE, background: 'transparent' })).toBe('background=transparent')
  })

  it('encodes charset as its label, not its glyphs', () => {
    const blocks = CHARSETS[2]
    expect(blocks).toBeDefined()
    expect(encode({ ...BASELINE, charset: blocks!.value })).toBe('charset=blocks')
  })

  it('omits a charset that is not in the catalogue rather than mangling it', () => {
    expect(encode({ ...BASELINE, charset: ' @#$' })).toBe('')
  })

  it('encodes pointer only when it is off', () => {
    expect(encode({ ...BASELINE, pointer: true })).toBe('')
    expect(encode({ ...BASELINE, pointer: false })).toBe('pointer=0')
  })

  it('never encodes effect or respectMotionPreference', () => {
    const config: MotesOptions = {
      ...BASELINE,
      effect: 'waves',
      respectMotionPreference: false,
    }
    expect(encode(config)).toBe('')
  })
})

describe('decode', () => {
  it('round-trips a fully tuned config', () => {
    const hairline = CHARSETS[3]
    expect(hairline).toBeDefined()
    // Every value here differs from BASELINE on purpose. Reusing a default
    // would let a key round-trip merely by never being encoded at all.
    const tuned: MotesOptions = {
      ...BASELINE,
      radius: 200,
      force: 2.5,
      density: 14,
      speed: 0.4,
      contrast: 1.5,
      brightness: 0.25,
      trail: 0.55,
      pointer: false,
      charset: hairline!.value,
      background: '#101010',
      ink: '#aabbcc',
      accent: '#12ab34',
    }
    for (const [key, value] of Object.entries(tuned)) {
      if (key === 'effect' || key === 'respectMotionPreference') continue
      expect(value, `${key} must differ from BASELINE`).not.toBe(
        BASELINE[key as keyof MotesOptions],
      )
    }
    expect({ ...BASELINE, ...decode(encode(tuned)) }).toEqual(tuned)
  })

  it('accepts a search string with or without the leading question mark', () => {
    expect(decode('?density=14')).toEqual({ density: 14 })
    expect(decode('density=14')).toEqual({ density: 14 })
  })

  it('clamps out-of-range numbers instead of rejecting them', () => {
    expect(decode('radius=99999')).toEqual({ radius: 360 })
    expect(decode('radius=-5')).toEqual({ radius: 40 })
  })

  it('quantises off-step numbers to the grid', () => {
    expect(decode('contrast=1.13')).toEqual({ contrast: 1.15 })
  })

  it('drops unparseable numbers rather than throwing', () => {
    expect(decode('radius=abc')).toEqual({})
    expect(decode('radius=')).toEqual({})
    expect(decode('radius=Infinity')).toEqual({})
  })

  it('ignores keys it does not own', () => {
    expect(decode('nope=1&effect=waves&respectMotionPreference=0')).toEqual({})
  })

  it('accepts only 0 and 1 for pointer', () => {
    expect(decode('pointer=0')).toEqual({ pointer: false })
    expect(decode('pointer=1')).toEqual({ pointer: true })
    expect(decode('pointer=maybe')).toEqual({})
  })

  it('drops an unknown charset label', () => {
    expect(decode('charset=nonsense')).toEqual({})
  })

  it('accepts only real hex lengths for colours', () => {
    expect(decode('ink=827865')).toEqual({ ink: '#827865' })
    expect(decode('ink=fff')).toEqual({ ink: '#fff' })
    expect(decode('ink=transparent')).toEqual({ ink: 'transparent' })
    expect(decode('ink=12345')).toEqual({})
    expect(decode('ink=zzzzzz')).toEqual({})
    expect(decode('ink=<script>')).toEqual({})
  })

  it('survives a hostile query string without throwing', () => {
    expect(() => decode('?a=%&&&=&radius=%E2%98%A0')).not.toThrow()
  })
})
