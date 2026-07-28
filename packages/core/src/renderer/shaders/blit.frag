// Present pass: copy the accumulation target to the screen 1:1.
// texelFetch keeps it exact — no filtering, no half-texel drift.

uniform sampler2D u_src;

void main() {
  // Alpha carries through: the accumulation target is premultiplied, and a
  // transparent background needs that alpha to reach the compositor.
  fragColor = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0);
}
