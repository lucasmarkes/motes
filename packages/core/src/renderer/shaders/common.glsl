// Shared uniforms and helpers available to every effect's field() and to main.

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_cellSize;
uniform float u_speed;
uniform vec3  u_accent;
uniform float u_trail;

uniform sampler2D u_glyphAtlas;
uniform int   u_charCount;

// --- pointer block (see pointer.glsl) ---
uniform vec2  u_pointer;
uniform vec2  u_pointerVel;
uniform float u_pointerActive;
uniform float u_radius;
uniform float u_force;

// The atlas is a horizontal strip of u_charCount monospace glyphs.
// Coverage lives in the red channel.
float sampleGlyph(int index, vec2 sub) {
  float u = (float(index) + sub.x) / float(u_charCount);
  return texture(u_glyphAtlas, vec2(u, 1.0 - sub.y)).r;
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

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
