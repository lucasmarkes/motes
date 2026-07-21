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
//
// Ported from the ascii-flux prototype. The three terms and their constants
// are the interaction feel — do not retune casually.
// ─────────────────────────────────────────────────────────────────────────

float pointerForce(vec2 px) {
  if (u_pointerOn < 0.5) return 0.0;

  vec2  d  = px - u_pointer;
  float d2 = dot(d, d);

  // Cull well outside the influence radius; the Gaussian is negligible there.
  if (d2 >= u_radius * u_radius * 2.2) return 0.0;

  float dist  = sqrt(d2);
  float sigma = u_radius * 0.55;
  float fall  = exp(-d2 / (2.0 * sigma * sigma));

  // Ripple travelling outward. Deliberately driven by unscaled time, so the
  // interaction keeps its own cadence independent of `speed`.
  float ripple = sin(dist * 0.06 - u_time * 6.0) * 0.5 + 0.5;

  // Wake: only the half the cursor is moving toward lights up.
  float wake = 0.0;
  if (dist > 0.001) {
    float along = dot(d, u_pointerVel) / (dist + 0.001);
    wake = max(0.0, along) * 0.08 * u_pointerEnergy;
  }

  return fall * (u_force * 0.06) * (0.5 + ripple)  // core, ripple-modulated
       + fall * wake                               // directional wake
       + fall * u_pointerEnergy * 0.5;             // energy glow
}
