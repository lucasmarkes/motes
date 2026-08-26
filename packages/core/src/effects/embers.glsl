// 04 — embers. Heat rising from the bottom edge: fbm dragged upward, hot at
// the floor, dissolving toward the top.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float h = cell.y / u_grid.y;                       // 0 top, 1 bottom
  vec2  p = cell * vec2(0.09, 0.16) + vec2(t * 0.05, t * 0.9);
  float n = fbm(p);
  float flame = smoothstep(0.42, 0.9, n + h * 0.65 - 0.32);
  return flame * (0.35 + 0.65 * h);
}
