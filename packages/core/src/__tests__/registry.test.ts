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

// removeEffect is public API — the counterpart to defineEffect. Deleting a
// built-in would break the library at runtime for every consumer, so it is
// guarded the same way collisions are: refused by default, with an explicit
// opt-out for the caller who truly means it.
describe('removeEffect built-in protection', () => {
  it('refuses to remove a built-in without an override', () => {
    expect(() => removeEffect('flow')).toThrow(/built-in/i)
    expect(getEffect('flow')).toBeDefined()
    expect(listEffects()).toContain('flow')
  })

  it('names the opt-out in the error', () => {
    expect(() => removeEffect('pulse')).toThrow(/override/i)
  })

  it('removes a built-in only with an explicit override', () => {
    const saved = getEffect('flow')
    expect(saved).toBeDefined()
    try {
      expect(removeEffect('flow', { override: true })).toBe(true)
      expect(getEffect('flow')).toBeUndefined()
    } finally {
      // Restore it: other tests, and other test files sharing this module in a
      // non-isolated run, assume the built-ins are present.
      defineEffect('flow', saved!)
    }
  })
})
