// 09 — ripples. Drops landing at random points and moments. Each opens a ring
// that expands and fades; between drops the field is quiet.
// No pointer math. The cursor arrives via the shared pass in main().
float field(vec2 cell, float t) {
  float v = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float P  = 2.4 + fi * 0.7;                        // period of drop i
    float u  = t / P + fi * 0.37;
    float k  = floor(u);
    float ph = fract(u);                              // k-th drop, phase 0..1
    vec2  c  = vec2(hash21(vec2(k * 3.0 + fi, fi * 7.0 + 1.0)),
                    hash21(vec2(fi * 5.0 + 2.0, k * 3.0))) * u_grid;
    float r  = length((cell - c) * vec2(0.6, 1.0));
    float R  = ph * 20.0;
    v += exp(-abs(r - R) * 0.55) * pow(1.0 - ph, 2.0) * (0.5 + 0.5 * sin(r * 1.4 - t * 4.0));
  }
  return min(1.0, v);
}
