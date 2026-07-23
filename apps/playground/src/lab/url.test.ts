import { describe, expect, it } from 'vitest'
import { encodeConfig, decodeConfig } from './url'
import { DEFAULT_CONFIG, DEFAULT_LOOK, PRESETS, type LabConfig } from './pipeline'

const roundTrip = (config: LabConfig): LabConfig => decodeConfig(encodeConfig(config))

describe('encodeConfig / decodeConfig', () => {
  it('round-trips the default config', () => {
    expect(roundTrip(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG)
  })

  it('round-trips a fully-edited config', () => {
    const config: LabConfig = {
      name: 'ember',
      stage: {
        turbulence: 2.3,
        pattern: 'rings',
        flow: 'down',
        speed: 0.7,
        mask: 'center',
        falloff: 3.1,
        contrast: 2.2,
        flicker: true,
      },
      look: {
        ...DEFAULT_LOOK,
        pointer: false,
        radius: 220,
        force: 2.5,
        density: 9,
        trail: 0.75,
        charset: ' ░▒▓█',
        accent: '#ff8800',
      },
    }
    expect(roundTrip(config)).toEqual(config)
  })

  it('round-trips every preset', () => {
    for (const [name, stage] of Object.entries(PRESETS)) {
      const config: LabConfig = { name, stage, look: DEFAULT_LOOK }
      expect(roundTrip(config)).toEqual(config)
    }
  })

  it('preserves a charset with spaces and an accent with #', () => {
    const config: LabConfig = {
      ...DEFAULT_CONFIG,
      look: { ...DEFAULT_LOOK, charset: " .'^\"~=xX", accent: '#0a0a0a' },
    }
    expect(roundTrip(config).look.charset).toBe(" .'^\"~=xX")
    expect(roundTrip(config).look.accent).toBe('#0a0a0a')
  })

  it('reads an empty search as the default config', () => {
    expect(decodeConfig('')).toEqual(DEFAULT_CONFIG)
    expect(decodeConfig('?')).toEqual(DEFAULT_CONFIG)
  })

  it('accepts a leading ? on the search string', () => {
    const encoded = encodeConfig(DEFAULT_CONFIG)
    expect(decodeConfig('?' + encoded)).toEqual(decodeConfig(encoded))
  })

  it('falls back to defaults for an unknown enum value', () => {
    const search = encodeConfig(DEFAULT_CONFIG) + '&pattern=bogus&mask=sideways'
    const out = decodeConfig(search)
    expect(out.stage.pattern).toBe(DEFAULT_CONFIG.stage.pattern)
    expect(out.stage.mask).toBe(DEFAULT_CONFIG.stage.mask)
  })

  it('falls back to defaults for a non-numeric number', () => {
    const search = 'turbulence=notanumber&falloff='
    const out = decodeConfig(search)
    expect(out.stage.turbulence).toBe(DEFAULT_CONFIG.stage.turbulence)
    expect(out.stage.falloff).toBe(DEFAULT_CONFIG.stage.falloff)
  })

  it('sanitizes a tampered name on decode', () => {
    const out = decodeConfig('name=' + encodeURIComponent('drop tables; --'))
    expect(out.name).toBe('droptables--')
  })

  it('omits default look values from the query, keeping links short', () => {
    // Nothing but the field is changed, so no look key should appear.
    const encoded = encodeConfig(DEFAULT_CONFIG)
    const params = new URLSearchParams(encoded)
    expect(params.has('radius')).toBe(false)
    expect(params.has('accent')).toBe(false)
    expect(params.has('charset')).toBe(false)
  })
})
