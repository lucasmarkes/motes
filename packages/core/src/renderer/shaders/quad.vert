#version 300 es
precision highp float;

// Full-screen triangle: no attribute buffers, position derived from
// gl_VertexID. Draw with drawArrays(TRIANGLES, 0, 3).
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
