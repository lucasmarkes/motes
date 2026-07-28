import { describe, expect, it } from 'vitest'
import type { MotesOptions } from '@lucasmarkes/motes'
import { PRESETS } from './presets'

const HEX = /^#[0-9a-fA-F]{6}$/

describe('PRESETS', () => {
  it('has exactly the five looks, in order', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['void', 'terminal', 'amber', 'paper', 'glass'])
  })

  it('gives every preset a valid Partial<MotesOptions> touching only background, ink and accent', () => {
    for (const preset of PRESETS) {
      expect(Object.keys(preset.values).sort()).toEqual(['accent', 'background', 'ink'])
      // Assigning to the wider type is the compile-time half of this check —
      // if a preset ever grew a field MotesOptions doesn't have, this line
      // stops building.
      const patch: Partial<MotesOptions> = preset.values
      expect(patch.background).toBe(preset.values.background)
    }
  })

  it('uses well-formed hex for every colour except Glass\'s transparent background', () => {
    for (const preset of PRESETS) {
      const { background, ink, accent } = preset.values
      if (preset.id === 'glass') {
        expect(background).toBe('transparent')
      } else {
        expect(background).toMatch(HEX)
      }
      expect(ink).toMatch(HEX)
      expect(accent).toMatch(HEX)
    }
  })

  // Pinned character-for-character so a typo'd hex value fails a test rather
  // than shipping as a slightly-wrong preset.
  it('matches the exact colour values', () => {
    expect(PRESETS).toEqual([
      { id: 'void', label: 'Void', values: { background: '#050403', ink: '#827865', accent: '#ddeafe' } },
      { id: 'terminal', label: 'Terminal', values: { background: '#020a04', ink: '#1f6b34', accent: '#7dffa8' } },
      { id: 'amber', label: 'Amber', values: { background: '#0a0500', ink: '#7a4a08', accent: '#ffb347' } },
      { id: 'paper', label: 'Paper', values: { background: '#f5f2ea', ink: '#8a8578', accent: '#1a1a1a' } },
      { id: 'glass', label: 'Glass', values: { background: 'transparent', ink: '#ffffff', accent: '#ddeafe' } },
    ])
  })
})
