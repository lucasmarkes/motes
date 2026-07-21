// Present pass: copy the accumulation target to the screen 1:1.
// texelFetch keeps it exact — no filtering, no half-texel drift.

uniform sampler2D u_src;

void main() {
  fragColor = vec4(texelFetch(u_src, ivec2(gl_FragCoord.xy), 0).rgb, 1.0);
}
