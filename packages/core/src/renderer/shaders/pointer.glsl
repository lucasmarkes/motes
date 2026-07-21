// ─────────────────────────────────────────────────────────────────────────
// THE SHARED POINTER LAYER — THE GOLDEN RULE
//
// This is the only place in motes where cursor math is allowed to live. It is
// applied in main() after field() returns, identically for every effect.
// An effect that wants pointer reactivity writes zero pointer code; it just
// sets `pointer: true`.
//
// If you are about to add cursor math to an effect's field(), stop. It
// belongs here.
// ─────────────────────────────────────────────────────────────────────────

float pointerForce(vec2 frag) {
  if (u_pointerActive <= 0.001) return 0.0;

  vec2  d    = frag - u_pointer;
  float dist = length(d);
  float n    = dist / max(u_radius, 1.0);
  float fall = exp(-n * n * 2.5);

  // Gaussian core: the field brightens toward the cursor.
  float core = fall;

  // Outward ripple: concentric wave travelling away from the cursor.
  float ripple = sin(dist * 0.075 - u_time * 3.6) * fall * 0.45;

  // Velocity wake: the field leans into the direction of travel.
  vec2  dir  = dist > 0.001 ? d / dist : vec2(0.0);
  float wake = dot(dir, u_pointerVel) * fall * 0.018;

  return (core + ripple + wake) * u_force * u_pointerActive;
}
