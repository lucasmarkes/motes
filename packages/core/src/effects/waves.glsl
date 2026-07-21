// 02 — waves. Layered sine bands, phase-shifted by a travelling warp.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float cx = cell.x;
  float cy = cell.y;

  float w = sin(cx * 0.12 + t * 1.1) * 0.5
          + sin(cx * 0.05 - cy * 0.09 + t * 0.7) * 0.5;

  float band = sin(cy * 0.22 + w * 1.6 + t * 0.5);

  return band * 0.5 + 0.5;
}
