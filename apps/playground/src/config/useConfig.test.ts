import { describe, expect, it } from 'vitest'
import { BASELINE } from './controls'
import { urlFor } from './useConfig'

describe('urlFor', () => {
  it('leaves a baseline config with a clean path and no query', () => {
    expect(urlFor('/flow', BASELINE)).toBe('/flow')
  })

  it('appends the encoded diff', () => {
    expect(urlFor('/flow', { ...BASELINE, density: 14 })).toBe('/flow?density=14')
  })

  it('drops the question mark again when a config returns to baseline', () => {
    // The regression this guards: writing `${pathname}?${encode(c)}` leaves a
    // bare "?" hanging on the address bar once the last tuned value goes home.
    expect(urlFor('/flow', { ...BASELINE, density: BASELINE.density })).toBe('/flow')
  })

  it('keeps the pathname it is given, so an effect switch lands on the new one', () => {
    expect(urlFor('/waves', { ...BASELINE, trail: 0.55 })).toBe('/waves?trail=0.55')
  })
})
