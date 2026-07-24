import { describe, expect, test } from 'vitest'
import { generateField } from './codegen'
import { PRESETS, type PresetName, type StageConfig } from './pipeline'

const PRESET_NAMES = Object.keys(PRESETS) as PresetName[]

// The exact contract main.frag expects: `float field(vec2 cell, float t)`.
const FIELD_SIGNATURE = /float\s+field\s*\(\s*vec2\s+cell\s*,\s*float\s+t\s*\)/

// The golden rule: a field() may never *reference* the pointer layer. That
// means none of its GLSL identifiers — the same check the library's own
// golden-rule.test.ts makes. A comment mentioning the pointer in prose is fine
// and, in the Lab's case, required (see the pedagogical-comment test below).
const POINTER_IDENTIFIERS = [
  'u_pointer',
  'u_pointerVel',
  'u_pointerEnergy',
  'u_pointerOn',
  'u_radius',
  'u_force',
  'pointerForce',
]

describe('generateField — contract', () => {
  test.each(PRESET_NAMES)('%s declares the exact field signature', (name) => {
    expect(generateField(PRESETS[name])).toMatch(FIELD_SIGNATURE)
  })

  test.each(PRESET_NAMES)('%s references no pointer identifier (golden rule)', (name) => {
    const src = generateField(PRESETS[name]).toLowerCase()
    for (const id of POINTER_IDENTIFIERS) {
      expect(src).not.toContain(id.toLowerCase())
    }
  })

  test.each(PRESET_NAMES)('%s carries a comment naming the stages', (name) => {
    expect(generateField(PRESETS[name])).toContain('stages:')
  })

  test.each(PRESET_NAMES)('%s explains that the pointer applies automatically', (name) => {
    // The moment the architecture lands: the reader sees they wrote no cursor
    // code and it reacts anyway. The brief requires this comment.
    const src = generateField(PRESETS[name]).toLowerCase()
    expect(src).toContain('cursor')
    expect(src).toContain('pointer layer')
  })

  test.each(PRESET_NAMES)('%s is deterministic for the same config', (name) => {
    expect(generateField(PRESETS[name])).toBe(generateField(PRESETS[name]))
  })
})

describe('generateField — params baked as literals', () => {
  test('contrast is baked into the shape stage', () => {
    const a = generateField({ ...PRESETS.fire, contrast: 1.5 })
    const b = generateField({ ...PRESETS.fire, contrast: 3.0 })
    expect(a).toContain('1.5')
    expect(b).toContain('3.0')
    expect(a).not.toBe(b)
  })

  test('flow speed is baked when flowing', () => {
    expect(generateField({ ...PRESETS.fire, flow: 'up', speed: 1.4 })).toContain('1.4')
  })
})

describe('generateField — stages are conditional', () => {
  const base: StageConfig = PRESETS.pulse

  test('turbulence stage appears only when amount > 0', () => {
    expect(generateField({ ...base, turbulence: 1.4 })).toContain('TURBULENCE')
    expect(generateField({ ...base, turbulence: 0 })).not.toContain('TURBULENCE')
  })

  test('mask stage appears only when not "none"', () => {
    expect(generateField({ ...base, mask: 'bottom' })).toContain('MASK')
    expect(generateField({ ...base, mask: 'none' })).not.toContain('MASK')
  })

  test('flicker appears only when enabled', () => {
    expect(generateField({ ...base, flicker: true }).toLowerCase()).toContain('flicker')
    expect(generateField({ ...base, flicker: false }).toLowerCase()).not.toContain('flicker')
  })

  test('flow stage is absent when still', () => {
    const still = generateField({ ...base, flow: 'still' })
    expect(still).not.toContain('float flow')
  })
})

describe('generateField — every pattern is expressible', () => {
  test.each(['fbm', 'bands', 'lanes', 'rings'] as const)('pattern %s generates a body', (pattern) => {
    const src = generateField({ ...PRESETS.pulse, pattern })
    expect(src).toContain('PATTERN')
    expect(src).toMatch(FIELD_SIGNATURE)
  })
})
