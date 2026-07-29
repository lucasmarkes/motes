/**
 * The parts of the `--tune` scene that do not need a browser.
 *
 * Split out for one reason: the choreography is the artefact, and the maths
 * under it — where a value sits on a track, which keyframes are legal, what a
 * seeded roll produces — is worth being able to test in a tenth of a second
 * rather than behind a ninety-second render.
 */

/**
 * A seeded PRNG, to stand in for `Math.random` inside the page.
 *
 * `randomize()` in the playground samples every numeric control and then
 * picks a charset and a preset (`config/actions.ts`). On the real
 * `Math.random` that makes the take non-reproducible, which would end the
 * determinism the whole rig is built on, and it can roll the field into
 * Terminal or Amber — presets the video deliberately does not use.
 *
 * mulberry32 because it is one line of state, passes the tests a demo needs,
 * and — the operative property — is short enough to serialise. This function
 * is stringified with `.toString()` and injected into the page in `video.mjs`,
 * so it must close over nothing at all.
 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The client x at which a slider's value sits.
 *
 * `Slider.tsx` maps a press absolutely: `rawFromClientX` reads
 * `min + ((clientX - rect.left) / rect.width) * (max - min)`, clamped. So the
 * inverse is plain linear interpolation across the measured `.track-hit`.
 *
 * The one distortion is the detent — `geometry.ts` slows the value within
 * eight pixels of the control's baseline, so a target inside that well lands
 * short. Every target this scene uses is far outside it, and the render
 * asserts the landed value against `aria-valuenow`, so a future target that
 * strays into the well fails the render rather than shipping off-key.
 */
export function valueX(track, value) {
  const { x, width, min, max } = track
  const span = max - min
  const t = span === 0 ? 0 : (value - min) / span
  return x + width * Math.min(1, Math.max(0, t))
}
