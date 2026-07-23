import { describe, expect, it } from 'vitest'
import { defineEffect, getEffect, listEffects, removeEffect } from '../effects/registry'

const FIELD = 'float field(vec2 cell, float t) { return 0.5; }'

// The Lab compiles a fresh, uniquely-named effect on every debounced edit, then
// prunes the previous one. Without pruning the registry grows without bound for
// the length of a session. removeEffect is that prune.
describe('removeEffect', () => {
  it('removes a registered effect so it can no longer be resolved', () => {
    defineEffect('__test_remove', { glsl: FIELD })
    expect(getEffect('__test_remove')).toBeDefined()
    expect(listEffects()).toContain('__test_remove')

    removeEffect('__test_remove')

    expect(getEffect('__test_remove')).toBeUndefined()
    expect(listEffects()).not.toContain('__test_remove')
  })

  it('reports whether the name was present', () => {
    defineEffect('__test_present', { glsl: FIELD })
    expect(removeEffect('__test_present')).toBe(true)
    expect(removeEffect('__test_present')).toBe(false)
  })

  it('is a no-op for an unknown name, not an error', () => {
    expect(() => removeEffect('__never_registered')).not.toThrow()
    expect(removeEffect('__never_registered')).toBe(false)
  })
})
