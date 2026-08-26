// 06 — contour. An fbm relief sliced into level curves. The terrain drifts and
// the lines reorganise themselves.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float h     = fbm(cell * vec2(0.04, 0.07) + t * vec2(0.07, 0.04));
  float bands = fract(h * 7.0);
  float line  = smoothstep(0.0, 0.14, bands) * smoothstep(0.3, 0.14, bands);
  return line * (0.4 + 0.6 * h);
}
