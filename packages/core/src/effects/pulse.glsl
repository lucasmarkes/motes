// 03 — pulse. Concentric rings breathing out from the centre of the field.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  vec2 centre = u_resolution / (2.0 * u_cellSize);
  float d = length(cell - centre);
  float rings = sin(d * 0.21 - t * 1.9);
  float decay = exp(-d * 0.016);
  return smoothstep(-0.25, 0.95, rings * decay + 0.18);
}
