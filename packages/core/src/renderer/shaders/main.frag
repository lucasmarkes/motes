// Assembled last. Expects common.glsl, the selected effect's field(), and
// pointer.glsl to have been concatenated above it.

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 cell = floor(frag / u_cellSize);
  vec2 sub  = fract(frag / u_cellSize);

  // 1. The effect. Time-only, pointer-blind, by construction.
  float v = field(cell, u_time * u_speed);

  // 2. The shared pointer pass. Same code for every effect.
  v += pointerForce(frag);

  v = clamp(v, 0.0, 1.0);

  // 3. Quantise to the glyph ramp and sample the atlas.
  int   gi       = int(v * float(u_charCount - 1) + 0.5);
  float coverage = sampleGlyph(gi, sub);

  // 4. Colour: dim base, intensifying toward the accent.
  vec3 base = vec3(0.30, 0.29, 0.26);
  vec3 col  = mix(base, u_accent, smoothstep(0.30, 1.0, v));

  fragColor = vec4(col * coverage, coverage);
}
