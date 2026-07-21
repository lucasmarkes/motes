/** Names of the effects that ship with motes. */
export type BuiltinEffect = 'flow' | 'waves' | 'pulse'

/**
 * A registered effect name. Built-ins are suggested by autocomplete; any
 * string registered through `defineEffect` is equally valid.
 */
export type EffectName = BuiltinEffect | (string & {})

export interface MotesOptions {
  /** Which field function drives the animation. */
  effect: EffectName
  /** Pointer reactivity. The whole point — on by default. */
  pointer: boolean
  /** Pointer influence radius, in CSS pixels. */
  radius: number
  /** Pointer force strength. */
  force: number
  /** Ambient animation speed multiplier. */
  speed: number
  /** Cell size in CSS pixels. Smaller is denser. */
  density: number
  /** Dark-to-bright glyph ramp. Index 0 must be a space. */
  charset: string
  /** Hex color the field intensifies toward. */
  accent: string
  /** Phosphor persistence, 0..1. 0 is crisp. */
  trail: number
}

/** Every option is optional at the call site; defaults fill the rest. */
export type MotesConfig = Partial<MotesOptions>

export interface MotesInstance {
  /** Begin the animation loop. Idempotent. */
  start(): void
  /** Pause the animation loop, retaining GL resources. Idempotent. */
  stop(): void
  /** Live-update any subset of options. */
  set(config: MotesConfig): void
  /** Read the current resolved options. */
  getOptions(): Readonly<MotesOptions>
  /** Full teardown: GL context, listeners, RAF. */
  destroy(): void
}

export interface EffectDef {
  /**
   * A GLSL snippet defining exactly one function:
   *
   * ```glsl
   * float field(vec2 cell, float t) { ... }  // returns 0..1
   * ```
   *
   * It must contain no pointer math. The pointer force is applied by the
   * shared pass in `main`, after `field()` returns, for every effect.
   */
  glsl: string
}

export const DEFAULT_OPTIONS: MotesOptions = {
  effect: 'flow',
  pointer: true,
  radius: 150,
  force: 1.4,
  speed: 1.0,
  density: 13,
  charset: ' .:-=+*#%@',
  accent: '#d8531f',
  trail: 0.3,
}
