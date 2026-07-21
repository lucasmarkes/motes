import { buildGlyphAtlas, validateCharset } from './atlas'
import { parseHexColor, type RGB } from './color'
import { getEffect, listEffects } from './effects/registry'
import { createRenderer, type Renderer } from './renderer/gl'
import { createPointer, type PointerController } from './renderer/pointer'
import {
  DEFAULT_OPTIONS,
  type MotesConfig,
  type MotesInstance,
  type MotesOptions,
} from './types'

const MAX_DPR = 2

/** Monospace advance is roughly 0.6em, so cells are taller than they are wide. */
function cellSize(density: number): { w: number; h: number } {
  return { w: Math.max(5, density * 0.6), h: density }
}

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
    // Validate resolved values, not just the provided patch.
    charset: config.charset ?? DEFAULT_OPTIONS.charset,
    effect: config.effect ?? DEFAULT_OPTIONS.effect,
  })

  const renderer: Renderer = createRenderer(canvas)
  const pointer: PointerController = createPointer(canvas)

  let accent: RGB = parseHexColor(options.accent)
  let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  let cols = 0
  let rows = 0

  let raf = 0
  let running = false
  let destroyed = false
  let startTime = 0

  function rebuildAtlas(): void {
    const { w, h } = cellSize(options.density)
    renderer.setAtlas(buildGlyphAtlas(options.charset, w, h, dpr))
  }

  /** Recompute the grid and drawing buffer. Returns true if the atlas is stale. */
  function measure(): boolean {
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight

    // Not laid out yet (display:none, detached); nothing sensible to draw.
    if (cssW === 0 || cssH === 0) return false

    const dprChanged = nextDpr !== dpr
    dpr = nextDpr

    const { w, h } = cellSize(options.density)
    cols = Math.ceil(cssW / w) + 1
    rows = Math.ceil(cssH / h) + 1

    renderer.resize(Math.floor(cssW * dpr), Math.floor(cssH * dpr))
    return dprChanged
  }

  const observer = new ResizeObserver(() => {
    if (measure()) rebuildAtlas()
  })

  function render(now: number): void {
    if (startTime === 0) startTime = now
    const time = (now - startTime) / 1000

    pointer.update()

    const { w, h } = cellSize(options.density)
    const p = pointer.state

    renderer.draw({
      time,
      dpr,
      cellW: w,
      cellH: h,
      cols,
      rows,
      speed: options.speed,
      accent,
      charCount: options.charset.length,
      pointerX: p.x,
      pointerY: p.y,
      pointerVx: p.vx,
      pointerVy: p.vy,
      pointerEnergy: p.energy,
      pointerOn: options.pointer && pointer.isLive(),
      radius: options.radius,
      force: options.force,
    })
  }

  const frame = (now: number): void => {
    if (!running) return
    render(now)
    raf = requestAnimationFrame(frame)
  }

  // Initial setup.
  renderer.setEffect(getEffect(options.effect)!)
  measure()
  rebuildAtlas()
  observer.observe(canvas)
  pointer.attach()

  return {
    start() {
      if (running || destroyed) return
      running = true
      startTime = 0
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

      const previous = options
      options = resolveOptions(options, patch)

      if (options.effect !== previous.effect) {
        renderer.setEffect(getEffect(options.effect)!)
      }
      if (options.accent !== previous.accent) {
        accent = parseHexColor(options.accent)
      }
      if (options.density !== previous.density) {
        measure()
      }
      if (
        options.charset !== previous.charset ||
        options.density !== previous.density
      ) {
        rebuildAtlas()
      }

      // A stopped instance still reflects the new options on the next draw.
      if (!running) {
        requestAnimationFrame((now) => {
          if (!destroyed && !running) render(now)
        })
      }
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
      observer.disconnect()
      pointer.detach()
      renderer.destroy()
    },
  }
}
