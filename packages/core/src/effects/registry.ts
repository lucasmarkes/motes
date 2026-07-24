import type { EffectDef, EffectName } from '../types'
import { NOISY } from '../dev'
import flowGlsl from './flow.glsl'
import wavesGlsl from './waves.glsl'
import pulseGlsl from './pulse.glsl'

const effects = new Map<string, EffectDef>()

/** Every effect must expose exactly one `float field(vec2, float)`. */
const FIELD_SIGNATURE = /float\s+field\s*\(/

/**
 * Register a custom effect. The snippet must define
 * `float field(vec2 cell, float t)` returning 0..1, and must contain no
 * pointer math — the cursor is applied by the shared pass in `main`.
 *
 * A name is yours to reuse, with two guards. Overwriting a **built-in** is
 * refused unless you pass `{ override: true }` — it would swap the field out
 * from under every consumer who asked for it by name, the same reason
 * removeEffect protects them. Overwriting your **own** name with a *changed*
 * definition warns in development, because it is usually an accidental
 * collision; the write still lands. Re-registering an identical definition is
 * silent — StrictMode and HMR both re-run the call with the same snippet, and
 * that is not worth a word.
 */
export function defineEffect(
  name: string,
  def: EffectDef,
  options?: { override?: boolean },
): void {
  if (!name) {
    throw new Error('[motes] defineEffect: name is required')
  }
  if (!def?.glsl || !FIELD_SIGNATURE.test(def.glsl)) {
    throw new Error(
      `[motes] defineEffect("${name}"): glsl must define "float field(vec2 cell, float t)"`,
    )
  }

  const existing = effects.get(name)
  if (existing) {
    if (BUILTINS.has(name) && !options?.override) {
      throw new Error(
        `[motes] defineEffect("${name}"): "${name}" is a built-in effect; pass { override: true } to replace it`,
      )
    }
    // A changed redefinition of a name you already own — flag it, but let it
    // through. Identical snippets (HMR, StrictMode) say nothing.
    if (NOISY && !BUILTINS.has(name) && existing.glsl !== def.glsl) {
      console.warn(
        `[motes] defineEffect("${name}"): overwriting an effect already registered under this name. If that is deliberate, ignore this; otherwise pick a different name.`,
      )
    }
  }

  effects.set(name, def)
}

export function getEffect(name: EffectName): EffectDef | undefined {
  return effects.get(name)
}

export function listEffects(): string[] {
  return [...effects.keys()]
}

/**
 * Unregister an effect. Returns whether the name was present; a no-op for an
 * unknown name. Removing a built-in would break the library at runtime for
 * every consumer, so it is refused unless you pass `{ override: true }`.
 *
 * Used to prune the uniquely-named effects the Lab compiles on every edit, so
 * the registry does not grow for the length of a session. It frees no GPU
 * resources: the compiled program is owned by the renderer and released when
 * the effect is swapped out or the instance is destroyed, not here.
 */
export function removeEffect(name: EffectName, options?: { override?: boolean }): boolean {
  if (BUILTINS.has(name) && !options?.override) {
    throw new Error(
      `[motes] removeEffect("${name}"): "${name}" is a built-in effect; pass { override: true } to remove it anyway`,
    )
  }
  return effects.delete(name)
}

defineEffect('flow', { glsl: flowGlsl })
defineEffect('waves', { glsl: wavesGlsl })
defineEffect('pulse', { glsl: pulseGlsl })

// The shipped names, snapshotted from exactly what was registered above, so the
// protected set can never drift from the built-ins it guards.
const BUILTINS = new Set(effects.keys())
