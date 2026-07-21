import type { GlyphAtlas } from '../atlas'
import type { EffectDef } from '../types'
import type { RGB } from '../color'
import quadVert from './shaders/quad.vert'
import commonGlsl from './shaders/common.glsl'
import pointerGlsl from './shaders/pointer.glsl'
import mainFrag from './shaders/main.frag'
import blitFrag from './shaders/blit.frag'

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

/** The background the phosphor decays toward; matches MOTES_BG in common.glsl. */
const BG: readonly [number, number, number] = [5 / 255, 4 / 255, 3 / 255]

const UNIFORM_NAMES = [
  'u_time',
  'u_resolution',
  'u_dpr',
  'u_cell',
  'u_grid',
  'u_speed',
  'u_accent',
  'u_glyphAtlas',
  'u_charCount',
  'u_prev',
  'u_fade',
  'u_pointer',
  'u_pointerVel',
  'u_pointerEnergy',
  'u_pointerOn',
  'u_radius',
  'u_force',
] as const

type UniformName = (typeof UNIFORM_NAMES)[number]
type UniformMap = Partial<Record<UniformName, WebGLUniformLocation>>

export interface FrameState {
  time: number
  dpr: number
  cellW: number
  cellH: number
  cols: number
  rows: number
  speed: number
  accent: RGB
  charCount: number
  pointerX: number
  pointerY: number
  pointerVx: number
  pointerVy: number
  pointerEnergy: number
  pointerOn: boolean
  radius: number
  force: number
  /** How far to pull the previous frame toward the background, 0..1. */
  fade: number
}

export interface Renderer {
  setEffect(effect: EffectDef): void
  setAtlas(atlas: GlyphAtlas): void
  resize(width: number, height: number): void
  draw(frame: FrameState): void
  destroy(): void
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('[motes] could not create shader')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    const kind = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
    throw new Error(`[motes] ${kind} shader failed to compile:\n${log}`)
  }

  return shader
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

  const program = gl.createProgram()
  if (!program) throw new Error('[motes] could not create program')

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  // The shaders are reference-counted by the program; drop our handles either way.
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`[motes] program failed to link:\n${log}`)
  }

  return program
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  })

  if (!gl) throw new Error('[motes] WebGL2 is not available in this browser')

  // No attribute buffers: the full-screen triangle comes from gl_VertexID.
  const vao = gl.createVertexArray()

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  // Half-float accumulation avoids an 8-bit quantisation floor: at long
  // persistence the per-frame decay of a near-background pixel can round to
  // zero change, stalling the fade and leaving a permanent haze.
  const canRenderFloat = Boolean(gl.getExtension('EXT_color_buffer_float'))

  const blitProgram = linkProgram(gl, VERTEX_SHADER, FRAGMENT_HEADER + blitFrag)
  const blitSrc = gl.getUniformLocation(blitProgram, 'u_src')

  interface Target {
    fb: WebGLFramebuffer
    tex: WebGLTexture
  }

  let targets: [Target, Target] | null = null
  // Typed as the tuple's own indices so reads are known-defined.
  let readIndex: 0 | 1 = 0

  let program: WebGLProgram | null = null
  let uniforms: UniformMap = {}
  let destroyed = false

  function createTarget(width: number, height: number): Target {
    const tex = gl!.createTexture()
    gl!.bindTexture(gl!.TEXTURE_2D, tex)
    if (canRenderFloat) {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA16F, width, height, 0,
        gl!.RGBA, gl!.HALF_FLOAT, null)
    } else {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, width, height, 0,
        gl!.RGBA, gl!.UNSIGNED_BYTE, null)
    }
    // NEAREST: the blit is 1:1, so filtering could only soften it.
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)

    const fb = gl!.createFramebuffer()
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb)
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0,
      gl!.TEXTURE_2D, tex, 0)

    // Start at the background so the first frames fade from black, not noise.
    gl!.clearColor(BG[0], BG[1], BG[2], 1)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)

    return { fb, tex }
  }

  function releaseTargets(): void {
    if (!targets) return
    for (const t of targets) {
      gl!.deleteFramebuffer(t.fb)
      gl!.deleteTexture(t.tex)
    }
    targets = null
  }

  function cacheUniforms(target: WebGLProgram): void {
    uniforms = {}
    for (const name of UNIFORM_NAMES) {
      const location = gl!.getUniformLocation(target, name)
      // Unused uniforms are optimised out; a missing location is expected.
      if (location) uniforms[name] = location
    }
  }

  return {
    setEffect(effect) {
      if (destroyed) return
      const next = linkProgram(gl, VERTEX_SHADER, assembleFragmentShader(effect))
      if (program) gl.deleteProgram(program)
      program = next
      gl.useProgram(program)
      cacheUniforms(program)
    },

    setAtlas(atlas) {
      if (destroyed) return
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        atlas.canvas,
      )
    },

    resize(width, height) {
      if (destroyed) return
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
      // The accumulation buffers hold screen-sized history; reallocate them.
      releaseTargets()
      targets = [createTarget(width, height), createTarget(width, height)]
      readIndex = 0
    },

    draw(frame) {
      if (destroyed || !program || !targets) return

      const read = targets[readIndex]
      const write = targets[readIndex === 0 ? 1 : 0]

      // Pass 1: field + pointer, composited over the decaying previous frame.
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb)
      gl.useProgram(program)
      gl.bindVertexArray(vao)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, read.tex)

      const u = uniforms
      if (u.u_prev) gl.uniform1i(u.u_prev, 1)
      if (u.u_fade) gl.uniform1f(u.u_fade, frame.fade)
      if (u.u_glyphAtlas) gl.uniform1i(u.u_glyphAtlas, 0)
      if (u.u_time) gl.uniform1f(u.u_time, frame.time)
      if (u.u_resolution) {
        gl.uniform2f(u.u_resolution, canvas.width, canvas.height)
      }
      if (u.u_dpr) gl.uniform1f(u.u_dpr, frame.dpr)
      if (u.u_cell) gl.uniform2f(u.u_cell, frame.cellW, frame.cellH)
      if (u.u_grid) gl.uniform2f(u.u_grid, frame.cols, frame.rows)
      if (u.u_speed) gl.uniform1f(u.u_speed, frame.speed)
      if (u.u_accent) gl.uniform3fv(u.u_accent, frame.accent)
      if (u.u_charCount) gl.uniform1i(u.u_charCount, frame.charCount)
      if (u.u_pointer) gl.uniform2f(u.u_pointer, frame.pointerX, frame.pointerY)
      if (u.u_pointerVel) {
        gl.uniform2f(u.u_pointerVel, frame.pointerVx, frame.pointerVy)
      }
      if (u.u_pointerEnergy) {
        gl.uniform1f(u.u_pointerEnergy, frame.pointerEnergy)
      }
      if (u.u_pointerOn) {
        gl.uniform1f(u.u_pointerOn, frame.pointerOn ? 1 : 0)
      }
      if (u.u_radius) gl.uniform1f(u.u_radius, frame.radius)
      if (u.u_force) gl.uniform1f(u.u_force, frame.force)

      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // Pass 2: present the accumulation target 1:1.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.useProgram(blitProgram)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, write.tex)
      if (blitSrc) gl.uniform1i(blitSrc, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      gl.bindVertexArray(null)
      readIndex = readIndex === 0 ? 1 : 0
    },

    destroy() {
      if (destroyed) return
      destroyed = true
      if (program) gl.deleteProgram(program)
      gl.deleteProgram(blitProgram)
      releaseTargets()
      gl.deleteTexture(texture)
      gl.deleteVertexArray(vao)
      program = null
      uniforms = {}
      // Deliberately NOT calling WEBGL_lose_context.loseContext(): a canvas
      // keeps returning its lost context from getContext() forever after, so
      // any later instance on the same element would get a dead context. The
      // context is released when the canvas itself is collected.
    },
  }
}
