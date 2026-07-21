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

export interface PointerController {
  readonly state: PointerState
  /** Advance smoothing by `dt` seconds. */
  update(dt: number): void
  /** Whether the shared GLSL pass should contribute this frame. */
  isLive(): boolean
  attach(): void
  detach(): void
}

export function createPointer(canvas: HTMLCanvasElement): PointerController {
  const state = createPointerState()

  function track(clientX: number, clientY: number): void {
    const rect = canvas.getBoundingClientRect()
    state.tx = clientX - rect.left
    state.ty = clientY - rect.top
    // First contact snaps, so the field does not sweep in from off-screen.
    if (!state.active) {
      state.x = state.tx
      state.y = state.ty
    }
    state.active = true
  }

  const onMove = (e: PointerEvent): void => track(e.clientX, e.clientY)
  const onDown = (e: PointerEvent): void => {
    track(e.clientX, e.clientY)
    state.energy = 1
  }
  const onLeave = (): void => {
    state.active = false
  }

  let attached = false

  return {
    state,

    update(dt) {
      stepPointer(state, dt)
    },

    isLive() {
      return state.active || state.energy > 0.02
    },

    attach() {
      if (attached) return
      attached = true
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerdown', onDown)
      canvas.addEventListener('pointerleave', onLeave)
    },

    detach() {
      if (!attached) return
      attached = false
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerleave', onLeave)
    },
  }
}
