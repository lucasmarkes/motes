// 08 — aurora. Vertical curtains of light swaying in the upper half: an fbm
// stretched along y gives the curtains, fine filaments give the texture.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float y    = cell.y / u_grid.y;
  float x    = cell.x * 0.05 + sin(cell.y * 0.06 + t * 0.3) * 0.8;
  float cur  = fbm(vec2(x + t * 0.15, cell.y * 0.02));
  float band = smoothstep(0.85, 0.3, y) * smoothstep(0.0, 0.18, y);
  float fil  = valueNoise(vec2(cell.x * 0.7 + t * 0.5, cell.y * 0.06));
  return smoothstep(0.42, 0.8, cur) * band * (0.45 + 0.55 * fil);
}
