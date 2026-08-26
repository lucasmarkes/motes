// 11 — corona. A dark disc at the centre with a plasma crown around it. The
// crown turns and breathes; the rim of the disc is a thin, sharp line.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  vec2  d = (cell - u_grid * 0.5) * vec2(0.6, 1.0);
  float r = length(d);
  float a = atan(d.y, d.x);
  float R = u_grid.y * 0.26;                          // disc radius
  if (r < R) return 0.0;
  float fl  = fbm(vec2(a * 1.6 + t * 0.15, r * 0.12 - t * 0.5));
  float cor = exp(-(r - R) * 0.13) * smoothstep(0.3, 0.9, fl + 0.15);
  float rim = exp(-abs(r - R) * 1.2);
  return min(1.0, rim * 0.9 + cor);
}
