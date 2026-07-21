// Assembled last. Expects common.glsl, the selected effect's field(), and
// pointer.glsl to have been concatenated above it.

void main() {
  // Work in CSS pixels with a top-left origin, matching the prototype's
  // coordinate space so every ported constant keeps its meaning.
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;

  vec2 g    = px / u_cell;
  vec2 cell = floor(g);
  vec2 sub  = fract(g);

  // 1. The effect. Time-only, pointer-blind, by construction.
  float v = field(cell, u_time * u_speed);

  // 2. The shared pointer pass. Same code for every effect.
  float boost = pointerForce(px);

  float val = v + boost;

  // Near-empty cells stay background: sparser field, and a cheap early out.
  if (val < 0.14) {
    fragColor = vec4(MOTES_BG, 1.0);
    return;
  }
  val = min(val, 1.0);

  // 3. Quantise to the glyph ramp and sample the atlas.
  int   gi  = int(val * float(u_charCount - 1));
  float cov = sampleGlyph(gi, sub);

  // 4. Colour: warm grey base, driven toward the accent by value and — much
  //    more strongly — by pointer boost. This is what makes the cursor read.
  float m    = min(1.0, val * 0.5 + boost * 1.4);
  float base = (60.0 + val * 70.0) / 255.0;
  vec3  dim  = vec3(base, base * 0.92, base * 0.78);
  vec3  col  = mix(dim, u_accent, m);

  fragColor = vec4(mix(MOTES_BG, col, cov), 1.0);
}
