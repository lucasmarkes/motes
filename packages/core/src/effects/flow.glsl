// 01 — flow. Domain-warped trig noise drifting on a slow current.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float cx = cell.x;
  float cy = cell.y;

  float wx = sin(cy * 0.15 + t * 0.6) * 1.4;
  float wy = cos(cx * 0.13 - t * 0.5) * 1.4;

  float a = sin((cx + wx) * 0.16 + t * 0.5);
  float b = cos((cy + wy) * 0.19 - t * 0.4);
  float c = sin((cx + cy) * 0.07 + t * 0.3);

  return ((a * b + c) / 2.0) * 0.5 + 0.5;
}
