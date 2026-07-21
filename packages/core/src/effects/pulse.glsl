// 03 — pulse. Radial waves breathing out from the centre of the grid.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  vec2  d    = cell - u_grid * 0.5;
  float dist = length(d);

  float p = sin(dist * 0.35 - t * 2.4)
          + sin(cell.x * 0.14 + t) * 0.4
          + sin(cell.y * 0.16 - t) * 0.4;

  return (p / 1.8) * 0.5 + 0.5;
}
