// 05 — dust. A sparse nebula: an fbm cloud decides where there is dust, a
// per-cell hash decides which grains exist, and each twinkles on its own clock.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float n       = fbm(cell * vec2(0.05, 0.09) + vec2(t * 0.12, -t * 0.04));
  float cloud   = smoothstep(0.48, 0.78, n);
  float g       = hash21(cell);
  float twinkle = 0.5 + 0.5 * sin(t * 2.5 + g * 40.0);
  return cloud * step(0.62, g) * (0.25 + 0.75 * twinkle);
}
