// Assembled last. Expects common.glsl, the selected effect's field(), and
// pointer.glsl to have been concatenated above it.

void main() {
  // Work in CSS pixels with a top-left origin, matching the prototype's
  // coordinate space so every ported constant keeps its meaning.
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;

  vec2 g    = px / u_cell;
  vec2 cell = floor(g);
  vec2 sub  = fract(g);

  // Phosphor: last frame, decayed toward the background. Premultiplied
  // throughout, so a transparent background decays toward vec4(0) — a clean
  // fade-out — and an opaque one is arithmetically what it always was.
  vec4 prev  = texelFetch(u_prev, ivec2(gl_FragCoord.xy), 0);
  vec4 faded = mix(prev, u_background, u_fade);

  // 1. The effect. Time-only, pointer-blind, by construction.
  float v = field(cell, u_time * u_speed);

  // 2. The ambient tone curve. Deliberately here, before the pointer pass:
  //    contrast reshapes which glyphs the field reaches for, and the cursor
  //    must still punch through at full strength across a flattened field.
  v = clamp((v - 0.5) * u_contrast + 0.5 + u_brightness, 0.0, 1.0);

  // 3. The shared pointer pass. Same code for every effect.
  float boost = pointerForce(px);

  float val = v + boost;

  // Near-empty cells leave the decaying frame untouched: sparser field, and a
  // cheap early out.
  if (val < 0.14) {
    fragColor = faded;
    return;
  }
  val = min(val, 1.0);

  // 4. Quantise to the glyph ramp and sample the atlas.
  int   gi  = int(val * float(u_charCount - 1));
  float cov = sampleGlyph(gi, sub);

  // 5. Colour. The ambient ramp runs from the background toward `ink`, so dim
  //    cells recede into whatever the background is — which is the whole
  //    reason a light background works at all. 0.44/0.56 and the #827865
  //    default are the solution to reproducing the old (60 + val*70)/255
  //    warm-grey ramp: worst case 0.68/255 across the range, under one 8-bit
  //    step. Changing them changes every existing user's page.
  float ramp = 0.44 + val * 0.56;
  vec3  dim  = mix(u_background.rgb, u_ink, ramp);
  float dimA = mix(ramp, 1.0, u_background.a);

  //    Value drives colour toward the accent, and pointer boost drives it far
  //    harder. This is what makes the cursor read.
  float m    = min(1.0, val * 0.5 + boost * 1.4);
  vec3  col  = mix(dim, u_accent, m);
  float colA = mix(dimA, 1.0, m);

  // 6. Composite the glyph over the decaying frame. Premultiplied source-over:
  //    coverage attenuates the destination and scales the source together.
  fragColor = mix(faded, vec4(col, colA), cov);
}
