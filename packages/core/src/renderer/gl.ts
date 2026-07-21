import type { EffectDef } from '../types'
import quadVert from './shaders/quad.vert'
import commonGlsl from './shaders/common.glsl'
import pointerGlsl from './shaders/pointer.glsl'
import mainFrag from './shaders/main.frag'

export const VERTEX_SHADER = quadVert

const FRAGMENT_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
`

/**
 * Assemble the fragment shader.
 *
 * The order is load-bearing: the effect's `field()` is sandwiched between the
 * shared helpers and the shared pointer pass, and `main` calls them in that
 * order. An effect therefore cannot see or override the pointer layer — the
 * orthogonality is structural, not a convention.
 */
export function assembleFragmentShader(effect: EffectDef): string {
  return [
    FRAGMENT_HEADER,
    commonGlsl,
    effect.glsl,
    pointerGlsl,
    mainFrag,
  ].join('\n')
}

/* ------------------------------------------------------------------------ *
 * Phase 1: WebGL2 context creation, program linking, uniform binding, the
 * ping-pong FBO used by `trail`, and the draw call land here.
 * ------------------------------------------------------------------------ */
