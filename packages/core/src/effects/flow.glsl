// 01 — flow. Domain-warped fbm drifting on a slow current.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  vec2 p = cell * 0.075;
  float warp = fbm(p + vec2(t * 0.14, t * 0.05));
  float n = fbm(p + vec2(warp * 1.6, -t * 0.09));
  return smoothstep(0.24, 0.82, n);
}
