// 02 — waves. Interfering sine bands on three axes.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float w = sin(cell.x * 0.115 + t * 0.85) * 0.50
          + sin(cell.y * 0.165 - t * 0.60) * 0.30
          + sin((cell.x + cell.y) * 0.075 + t * 1.25) * 0.20;
  return smoothstep(-0.55, 0.85, w);
}
