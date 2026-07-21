/**
 * JS-side pointer state fed to the shared GLSL pointer layer as uniforms.
 *
 * Phase 1 implements the smoothing model ported from the prototype:
 * lerp an internal position toward the raw target each frame, derive velocity
 * from the per-frame delta, and decay `active` when the pointer is idle or has
 * left the canvas so the wake fades instead of snapping.
 */
export interface PointerState {
  /** Smoothed position, in device pixels, y-up to match gl_FragCoord. */
  x: number
  y: number
  /** Per-frame delta, driving the velocity wake. */
  vx: number
  vy: number
  /** Energy, 0..1. Decays toward 0 when idle or off-canvas. */
  active: number
}

export function createPointerState(): PointerState {
  return { x: 0, y: 0, vx: 0, vy: 0, active: 0 }
}

/** Energy and velocity bleed off over time so the wake fades rather than snaps. */
export function decayPointer(state: PointerState, dt: number): void {
  const k = Math.exp(-dt * 3.2)
  state.vx *= k
  state.vy *= k
  state.active *= k
}
