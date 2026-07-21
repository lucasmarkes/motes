import { describe, expect, it } from 'vitest'
import { assembleFragmentShader } from '../renderer/gl'
import { defineEffect, getEffect, listEffects } from '../effects/registry'

const BUILTINS = ['flow', 'waves', 'pulse'] as const

/** Uniforms that only the shared pointer layer is allowed to touch. */
const POINTER_UNIFORMS = [
  'u_pointer',
  'u_pointerVel',
  'u_pointerEnergy',
  'u_pointerOn',
  'u_radius',
  'u_force',
]

describe('effect registry', () => {
  it('registers the three built-ins', () => {
    expect(listEffects()).toEqual(expect.arrayContaining([...BUILTINS]))
  })

  it('rejects a snippet without a field() function', () => {
    expect(() => defineEffect('bad', { glsl: 'float nope() { return 0.0; }' }))
      .toThrow(/float field/)
  })
})

describe('the golden rule: pointer is orthogonal to every effect', () => {
  it.each(BUILTINS)('%s contains no pointer math of its own', (name) => {
    const effect = getEffect(name)!
    for (const uniform of POINTER_UNIFORMS) {
      expect(effect.glsl).not.toContain(uniform)
    }
    expect(effect.glsl).not.toContain('pointerForce')
  })

  it.each(BUILTINS)('%s still gets the shared pointer pass', (name) => {
    const src = assembleFragmentShader(getEffect(name)!)
    expect(src).toContain('float pointerForce(vec2 px)')
    expect(src).toContain('float boost = pointerForce(px);')
  })

  it('a brand-new effect becomes pointer-reactive with zero pointer code', () => {
    defineEffect('rain', {
      glsl: `
        float field(vec2 cell, float t) {
          float col = fract(sin(cell.x * 91.7) * 4321.0);
          float drop = fract(col * 7.0 + t * (0.6 + col));
          return smoothstep(0.0, 0.08, drop) * (1.0 - drop);
        }
      `,
    })

    const src = assembleFragmentShader(getEffect('rain')!)
    expect(src).toContain('float boost = pointerForce(px);')
  })

  it('assembles in the load-bearing order: common, field, pointer, main', () => {
    const src = assembleFragmentShader(getEffect('flow')!)
    const order = [
      src.indexOf('float sampleGlyph'),
      src.indexOf('float field'),
      src.indexOf('float pointerForce'),
      src.indexOf('void main'),
    ]
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(order.every((i) => i >= 0)).toBe(true)
  })
})
