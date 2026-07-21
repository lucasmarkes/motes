/**
 * JS-side pointer state feeding the shared GLSL pointer layer.
 *
 * Ported from the ascii-flux prototype. The smoothing constants are the
 * interaction feel: a 0.25 lerp toward the raw target, velocity taken as the
 * per-frame delta, and an energy term that accumulates with speed and bleeds
 * off when the cursor idles or leaves — so the wake fades instead of snapping.
 */
export interface PointerState {
  /** Smoothed position, CSS px, top-left origin. */
  x: number
  y: number
  /** Raw target position. */
  tx: number
  ty: number
  /** Per-frame delta, driving the directional wake. */
  vx: number
  vy: number
  /** Whether the cursor is currently over the canvas. */
  active: boolean
  /** 0..1, accumulates with movement, decays when idle. */
  energy: number
}

const OFFSCREEN = -9999

export interface PointerController {
  readonly state: PointerState
  /** Advance smoothing by one frame. */
  update(): void
  /** Whether the shared GLSL pass should contribute this frame. */
  isLive(): boolean
  attach(): void
  detach(): void
}

export function createPointer(canvas: HTMLCanvasElement): PointerController {
  const state: PointerState = {
    x: OFFSCREEN,
    y: OFFSCREEN,
    tx: OFFSCREEN,
    ty: OFFSCREEN,
    vx: 0,
    vy: 0,
    active: false,
    energy: 0,
  }

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

    update() {
      if (state.active) {
        const px = state.x
        const py = state.y
        state.x += (state.tx - state.x) * 0.25
        state.y += (state.ty - state.y) * 0.25
        state.vx = state.x - px
        state.vy = state.y - py
        const speed = Math.hypot(state.vx, state.vy)
        state.energy = Math.min(1, state.energy * 0.9 + speed * 0.03)
      } else {
        state.energy *= 0.92
      }
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
