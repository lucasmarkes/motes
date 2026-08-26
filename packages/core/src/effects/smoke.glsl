// 10 — smoke. A plume rising from the centre of the floor, curling over itself
// (domain warp) and widening until it dissolves at the top.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float h   = cell.y / u_grid.y;
  vec2  p   = cell * vec2(0.07, 0.12) + vec2(0.0, t * 0.35);
  float w   = fbm(p * 1.3 + vec2(t * 0.1, 0.0));
  float n   = fbm(p + vec2(w * 1.6, w * 0.4));
  float wd  = 0.1 + (1.0 - h) * 0.32;                 // widens as it rises
  float src = exp(-pow((cell.x / u_grid.x - 0.5) / wd, 2.0));
  return smoothstep(0.38, 0.78, n) * src * (0.25 + 0.75 * h);
}
