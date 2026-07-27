import { describe, expect, it, vi } from 'vitest'
import { defineEffect, getEffect, listEffects, removeEffect } from '../effects/registry'

const FIELD = 'float field(vec2 cell, float t) { return 0.5; }'
const OTHER = 'float field(vec2 cell, float t) { return 0.25; }'

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

// defineEffect is the other half of the same contract: overwriting a built-in
// would swap the field out from under every consumer who asked for it by name,
// so a name collision with a built-in is refused unless the caller opts in —
// exactly as removeEffect refuses to delete one.
describe('defineEffect built-in protection', () => {
  it('refuses to redefine a built-in without an override, leaving it untouched', () => {
    const before = getEffect('waves')
    expect(() => defineEffect('waves', { glsl: FIELD })).toThrow(/built-in/i)
    expect(getEffect('waves')).toBe(before)
  })

  it('names the opt-out in the error', () => {
    expect(() => defineEffect('pulse', { glsl: FIELD })).toThrow(/override/i)
  })

  it('replaces a built-in only with an explicit override', () => {
    const saved = getEffect('waves')!
    try {
      defineEffect('waves', { glsl: FIELD }, { override: true })
      expect(getEffect('waves')?.glsl).toBe(FIELD)
    } finally {
      defineEffect('waves', saved, { override: true })
    }
  })
})

// StrictMode and HMR both re-run a consumer's `defineEffect('mine', …)` call,
// usually with the identical snippet — so silent re-registration is normal and
// must stay quiet. A *changed* redefinition of a name you already own is the
// one worth flagging: probably an accidental collision, never fatal, so it
// warns in development and the write still wins. Fresh names never warn.
describe('defineEffect redefinition warning', () => {
  it('warns when overwriting an existing custom effect with a changed definition', () => {
    defineEffect('__warn_changed', { glsl: FIELD })
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      defineEffect('__warn_changed', { glsl: OTHER })
      expect(spy).toHaveBeenCalledTimes(1)
      expect(String(spy.mock.calls[0]?.[0])).toMatch(/__warn_changed/)
      // The warning is advisory, not a veto — the new definition still lands.
      expect(getEffect('__warn_changed')?.glsl).toBe(OTHER)
    } finally {
      spy.mockRestore()
      removeEffect('__warn_changed')
    }
  })

  it('stays quiet when the definition is identical (HMR / StrictMode re-run)', () => {
    defineEffect('__warn_same', { glsl: FIELD })
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      defineEffect('__warn_same', { glsl: FIELD })
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
      removeEffect('__warn_same')
    }
  })

  it('does not warn on a first registration', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      defineEffect('__warn_first', { glsl: FIELD })
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
      removeEffect('__warn_first')
    }
  })
})
