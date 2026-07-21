// Shared uniforms and helpers available to every effect's field() and to main.

uniform float u_time;        // seconds since start, unscaled by speed
uniform vec2  u_resolution;  // drawing buffer size, device px
uniform float u_dpr;
uniform vec2  u_cell;        // cell size in CSS px: (dens * 0.6, dens)
uniform vec2  u_grid;        // cols, rows
uniform float u_speed;
uniform vec3  u_accent;

uniform sampler2D u_glyphAtlas;
uniform int   u_charCount;

// --- pointer block: written only by the shared pass, see pointer.glsl ---
uniform vec2  u_pointer;       // CSS px, top-left origin
uniform vec2  u_pointerVel;    // CSS px per frame
uniform float u_pointerEnergy; // 0..1
uniform float u_pointerOn;     // 0 or 1
uniform float u_radius;
uniform float u_force;

const vec3 MOTES_BG = vec3(5.0 / 255.0, 4.0 / 255.0, 3.0 / 255.0);

// The atlas is a horizontal strip of u_charCount monospace glyphs, drawn
// white on transparent. Coverage is the alpha channel.
float sampleGlyph(int index, vec2 sub) {
  float u = (float(index) + sub.x) / float(u_charCount);
  return texture(u_glyphAtlas, vec2(u, sub.y)).a;
}

// ── Convenience noise for custom effects. Unused functions are stripped by
// the GLSL compiler, so these cost nothing unless a field() calls them.

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * valueNoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return sum;
}
