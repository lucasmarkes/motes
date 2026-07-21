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

/**
 * Floor on the per-frame fade. Without it `trail: 1` would never converge and
 * the field would smear into a solid wash. Ported from the prototype.
 */
const MIN_FADE = 0.08

/** Monospace advance is roughly 0.6em, so cells are taller than they are wide. */
function cellSize(density: number): { w: number; h: number } {
  return { w: Math.max(5, density * 0.6), h: density }
}

/**
 * Drop keys whose value is `undefined`.
 *
 * Spreading a patch would otherwise let an explicit `undefined` clobber a
 * resolved value — `radius: cond ? 200 : undefined` is ordinary React, and
 * without this it lands as `Math.max(1, undefined)` → NaN in a uniform.
 */
function compact(patch: MotesConfig): MotesConfig {
  const out: MotesConfig = {}
  for (const key of Object.keys(patch) as (keyof MotesConfig)[]) {
    if (patch[key] !== undefined) Object.assign(out, { [key]: patch[key] })
  }
  return out
}

function resolveOptions(base: MotesOptions, patch: MotesConfig): MotesOptions {
  const next: MotesOptions = { ...base, ...compact(patch) }

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
  let lastTime = 0

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

  /**
   * Dragging a window between monitors of different density changes
   * devicePixelRatio without changing the element's CSS size, so
   * ResizeObserver never fires and the atlas would stay at the old device
   * resolution. Watch the ratio itself and re-arm after every change.
   */
  let dprQuery: MediaQueryList | null = null

  function onDprChange(): void {
    if (measure()) rebuildAtlas()
    watchDpr()
  }

  function watchDpr(): void {
    dprQuery?.removeEventListener('change', onDprChange)
    // Track the true ratio, not the capped one: it can move above MAX_DPR and
    // back down again, and we still need to notice the return trip.
    dprQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    )
    dprQuery.addEventListener('change', onDprChange)
  }

  function render(now: number): void {
    if (startTime === 0) {
      startTime = now
      lastTime = now
    }
    const time = (now - startTime) / 1000
    const dt = (now - lastTime) / 1000
    lastTime = now

    pointer.update(dt)

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
      // The prototype's phosphor clear: fade the previous frame toward the
      // background by (1 - trail), floored so persistence always terminates.
      fade: Math.max(MIN_FADE, 1 - options.trail),
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
  watchDpr()
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
      dprQuery?.removeEventListener('change', onDprChange)
      dprQuery = null
      pointer.detach()
      renderer.destroy()
    },
  }
}
