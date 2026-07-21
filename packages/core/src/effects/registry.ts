import type { EffectDef, EffectName } from '../types'
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
 */
export function defineEffect(name: string, def: EffectDef): void {
  if (!name) {
    throw new Error('[motes] defineEffect: name is required')
  }
  if (!def?.glsl || !FIELD_SIGNATURE.test(def.glsl)) {
    throw new Error(
      `[motes] defineEffect("${name}"): glsl must define "float field(vec2 cell, float t)"`,
    )
  }
  effects.set(name, def)
}

export function getEffect(name: EffectName): EffectDef | undefined {
  return effects.get(name)
}

export function listEffects(): string[] {
  return [...effects.keys()]
}

defineEffect('flow', { glsl: flowGlsl })
defineEffect('waves', { glsl: wavesGlsl })
defineEffect('pulse', { glsl: pulseGlsl })
