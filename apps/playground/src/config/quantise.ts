/**
 * Snap to the step grid, clamp to the range, and stop float drift there.
 *
 * Three of the five sliders on this panel step by 0.1 or 0.01, and naive
 * arithmetic on those produces 0.30000000000000004. That is not a display
 * problem to be papered over by `format` — the number goes on to the renderer
 * as a uniform, so it gets fixed at the source.
 *
 * It lives here rather than in Slider.tsx because the slider is no longer the
 * only caller: the URL codec has to clamp untrusted input against the same
 * grid, and randomize has to land on it. Three copies of this arithmetic would
 * be three chances to disagree about what a legal value is.
 */
export function quantise(raw: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((raw - min) / step) * step
  const clamped = Math.min(max, Math.max(min, snapped))
  const decimals = decimalsOf(step)
  return decimals ? parseFloat(clamped.toFixed(decimals)) : clamped
}

/** Digits after the point implied by a step, for serialising at its precision. */
export function decimalsOf(step: number): number {
  return (String(step).split('.')[1] ?? '').length
}
