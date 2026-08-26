// 07 — moire. Two ring sources wandering the grid; where their rings cross, an
// interference pattern that never repeats.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  vec2 c1 = u_grid * vec2(0.3 + 0.2 * sin(t * 0.4),  0.5 + 0.3 * cos(t * 0.3));
  vec2 c2 = u_grid * vec2(0.7 - 0.2 * cos(t * 0.35), 0.5 - 0.3 * sin(t * 0.25));
  float r1 = sin(length((cell - c1) * vec2(0.6, 1.0)) * 0.55 - t * 1.5);
  float r2 = sin(length((cell - c2) * vec2(0.6, 1.0)) * 0.55 + t * 1.2);
  return r1 * r2 * 0.5 + 0.5;
}
