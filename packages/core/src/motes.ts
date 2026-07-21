import { validateCharset } from './atlas'
import { getEffect, listEffects } from './effects/registry'
import { createPointerState, decayPointer } from './renderer/pointer'
import {
  DEFAULT_OPTIONS,
  type MotesConfig,
  type MotesInstance,
  type MotesOptions,
} from './types'

function resolveOptions(base: MotesOptions, patch: MotesConfig): MotesOptions {
  const next: MotesOptions = { ...base, ...patch }

  if (patch.charset !== undefined) validateCharset(next.charset)
  if (patch.effect !== undefined && !getEffect(next.effect)) {
    throw new Error(
      `[motes] unknown effect "${next.effect}". Registered: ${listEffects().join(', ')}`,
    )
  }

  next.radius = Math.max(1, next.radius)
  next.density = Math.max(2, next.density)
  next.trail = Math.min(1, Math.max(0, next.trail))

  return next
}

export function createMotes(
  canvas: HTMLCanvasElement,
  config: MotesConfig = {},
): MotesInstance {
  if (!canvas) throw new Error('[motes] createMotes requires a canvas element')

  let options = resolveOptions(DEFAULT_OPTIONS, {
    ...config,
    // Force validation of the resolved values, not just the provided patch.
    charset: config.charset ?? DEFAULT_OPTIONS.charset,
    effect: config.effect ?? DEFAULT_OPTIONS.effect,
  })

  const pointer = createPointerState()

  let raf = 0
  let running = false
  let destroyed = false
  let lastTime = 0

  const frame = (now: number): void => {
    if (!running) return
    const dt = lastTime === 0 ? 0 : Math.min(0.1, (now - lastTime) / 1000)
    lastTime = now

    decayPointer(pointer, dt)

    // Phase 1: upload uniforms and draw.

    raf = requestAnimationFrame(frame)
  }

  return {
    start() {
      if (running || destroyed) return
      running = true
      lastTime = 0
      raf = requestAnimationFrame(frame)
    },

    stop() {
      if (!running) return
      running = false
      cancelAnimationFrame(raf)
      raf = 0
    },

    set(patch: MotesConfig) {
      if (destroyed) return
      options = resolveOptions(options, patch)
      // Phase 1: rebuild the program on `effect`, the atlas on `charset`.
    },

    getOptions() {
      return options
    },

    destroy() {
      if (destroyed) return
      destroyed = true
      running = false
      cancelAnimationFrame(raf)
      raf = 0
      // Phase 1: delete GL resources and detach listeners.
    },
  }
}
