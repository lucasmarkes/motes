/**
 * JS-side pointer state feeding the shared GLSL pointer layer.
 *
 * Ported from the ascii-flux prototype, whose smoothing ran on fixed
 * per-frame constants tuned at 60Hz. Those constants are preserved exactly —
 * see REFERENCE_* below — but re-anchored against elapsed time so a 120Hz
 * display feels identical to a 60Hz one rather than twice as twitchy.
 *
 * At dt = 1/60 every derived value collapses to the prototype's literal
 * constant, so 60Hz remains the calibration point.
 */
export interface PointerState {
  /** Smoothed position, CSS px, top-left origin. */
  x: number
  y: number
  /** Raw target position. */
  tx: number
  ty: number
  /**
   * Velocity, expressed as displacement per 60Hz frame so the shader's wake
   * constant keeps its calibrated meaning at any refresh rate.
   */
  vx: number
  vy: number
  /** Whether the cursor is currently over the canvas. */
  active: boolean
  /** 0..1, accumulates with movement, decays when idle. */
  energy: number
}

/** The rate the prototype's constants were tuned at. */
export const REFERENCE_DT = 1 / 60

/** Prototype constants, per 60Hz frame. */
const REFERENCE_LERP = 0.25
const REFERENCE_ENERGY_DECAY = 0.9
const REFERENCE_IDLE_DECAY = 0.92
const REFERENCE_ENERGY_GAIN = 0.03

/** A stalled tab can hand back an enormous dt; clamp before it becomes a jump. */
const MAX_DT = 1 / 15
const MIN_DT = 1e-4

const OFFSCREEN = -9999

/**
 * Advance the smoothing by `dt` seconds.
 *
 * Exponential terms convert exactly: a per-frame retention of `k` at 60Hz is
 * `k ** (dt / REFERENCE_DT)` over an arbitrary step.
 *
 * The energy gain is the subtle one. Scaling the injection by `dt / REFERENCE_DT`
 * is only correct to first order and leaves the steady state a few percent low
 * at high refresh rates. Scaling it by `(1 - decay) / (1 - REFERENCE_ENERGY_DECAY)`
 * instead makes the fixed point `gain / (1 - decay)` independent of dt, so the
 * energy a given cursor speed settles at is identical on every display.
 */
export function stepPointer(state: PointerState, dt: number): void {
  const step = Math.min(MAX_DT, Math.max(MIN_DT, dt)) / REFERENCE_DT

  if (state.active) {
    const lerp = 1 - Math.pow(1 - REFERENCE_LERP, step)
    const decay = Math.pow(REFERENCE_ENERGY_DECAY, step)
    const gain =
      REFERENCE_ENERGY_GAIN * ((1 - decay) / (1 - REFERENCE_ENERGY_DECAY))

    const px = state.x
    const py = state.y
    state.x += (state.tx - state.x) * lerp
    state.y += (state.ty - state.y) * lerp

    // Re-express displacement in per-60Hz-frame units.
    state.vx = (state.x - px) / step
    state.vy = (state.y - py) / step

    const speed = Math.hypot(state.vx, state.vy)
    state.energy = Math.min(1, state.energy * decay + speed * gain)
  } else {
    state.energy *= Math.pow(REFERENCE_IDLE_DECAY, step)
  }
}

export function createPointerState(): PointerState {
  return {
    x: OFFSCREEN,
    y: OFFSCREEN,
    tx: OFFSCREEN,
    ty: OFFSCREEN,
    vx: 0,
    vy: 0,
    active: false,
    energy: 0,
  }
}

export interface PointerRect {
  left: number
  top: number
  width: number
  height: number
}

export interface PointerHit {
  x: number
  y: number
  inside: boolean
}

/** Canvas-relative position of a client point, and whether it landed inside. */
export function hitTest(
  rect: PointerRect,
  clientX: number,
  clientY: number,
): PointerHit {
  const x = clientX - rect.left
  const y = clientY - rect.top
  return {
    x,
    y,
    inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height,
  }
}

export interface PointerController {
  readonly state: PointerState
  /** Advance smoothing by `dt` seconds. */
  update(dt: number): void
  /** Whether the shared GLSL pass should contribute this frame. */
  isLive(): boolean
  /** Re-read the canvas box. Call after anything that can move it. */
  refreshRect(): void
  attach(): void
  detach(): void
}

/**
 * Pointer events are taken from the window and hit-tested against the canvas
 * box, rather than listened for on the canvas itself.
 *
 * This is what lets a field sit behind page content: the canvas can carry
 * `pointer-events: none` and never swallow a click, while the field still
 * reacts as the cursor crosses whatever is stacked on top of it. Listening on
 * the canvas would mean the effect died under every heading and button.
 */
export function createPointer(canvas: HTMLCanvasElement): PointerController {
  const state = createPointerState()

  // Cached: reading layout on every pointermove would force a reflow.
  let rect: PointerRect = { left: 0, top: 0, width: 0, height: 0 }

  function refreshRect(): void {
    const r = canvas.getBoundingClientRect()
    rect = { left: r.left, top: r.top, width: r.width, height: r.height }
  }

  function track(clientX: number, clientY: number, press: boolean): void {
    const hit = hitTest(rect, clientX, clientY)
    if (!hit.inside) {
      state.active = false
      return
    }
    state.tx = hit.x
    state.ty = hit.y
    // First contact snaps, so the field does not sweep in from off-screen.
    if (!state.active) {
      state.x = hit.x
      state.y = hit.y
    }
    state.active = true
    if (press) state.energy = 1
  }

  const onMove = (e: PointerEvent): void => track(e.clientX, e.clientY, false)
  const onDown = (e: PointerEvent): void => track(e.clientX, e.clientY, true)
  const onOut = (): void => {
    state.active = false
  }
  const onScroll = (): void => refreshRect()

  let attached = false

  return {
    state,

    update(dt) {
      stepPointer(state, dt)
    },

    isLive() {
      return state.active || state.energy > 0.02
    },

    refreshRect,

    attach() {
      if (attached) return
      attached = true
      refreshRect()
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('blur', onOut)
      document.addEventListener('pointerleave', onOut)
      // Capture: scrolling any ancestor moves the box, not just the window.
      window.addEventListener('scroll', onScroll, {
        passive: true,
        capture: true,
      })
    },

    detach() {
      if (!attached) return
      attached = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('blur', onOut)
      document.removeEventListener('pointerleave', onOut)
      window.removeEventListener('scroll', onScroll, { capture: true })
    },
  }
}
