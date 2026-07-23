import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { chromium, type Browser } from 'playwright'
import { generateField } from './codegen'
import { PRESETS, type PresetName } from './pipeline'

// String assertions can't tell a valid shader from a broken one — only a GL
// driver can. This gate assembles each preset's generated field() exactly the
// way the renderer does, then compiles and links it in a real WebGL2 context.

const SHADERS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/core/src/renderer/shaders',
)
const read = (name: string) => readFileSync(resolve(SHADERS, name), 'utf8')

// Mirrors gl.ts: FRAGMENT_HEADER + common + field + pointer + main.
const FRAGMENT_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
`
const COMMON = read('common.glsl')
const POINTER = read('pointer.glsl')
const MAIN = read('main.frag')
const VERTEX = read('quad.vert')

function assembleFragment(field: string): string {
  return [FRAGMENT_HEADER, COMMON, field, POINTER, MAIN].join('\n')
}

let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)
afterAll(async () => {
  await browser?.close()
})

async function compile(vertex: string, fragment: string) {
  const page = await browser.newPage()
  try {
    return await page.evaluate(
      ({ vertex, fragment }) => {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2')
        if (!gl) return { ok: false, stage: 'context', log: 'no webgl2 context' }

        const build = (type: number, src: string) => {
          const sh = gl.createShader(type)!
          gl.shaderSource(sh, src)
          gl.compileShader(sh)
          const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS) as boolean
          return { sh, ok, log: gl.getShaderInfoLog(sh) ?? '' }
        }

        const vs = build(gl.VERTEX_SHADER, vertex)
        if (!vs.ok) return { ok: false, stage: 'vertex', log: vs.log }
        const fs = build(gl.FRAGMENT_SHADER, fragment)
        if (!fs.ok) return { ok: false, stage: 'fragment', log: fs.log }

        const prog = gl.createProgram()!
        gl.attachShader(prog, vs.sh)
        gl.attachShader(prog, fs.sh)
        gl.linkProgram(prog)
        const ok = gl.getProgramParameter(prog, gl.LINK_STATUS) as boolean
        return { ok, stage: 'link', log: ok ? '' : (gl.getProgramInfoLog(prog) ?? '') }
      },
      { vertex, fragment },
    )
  } finally {
    await page.close()
  }
}

test.each(Object.keys(PRESETS) as PresetName[])(
  'preset "%s" generates GLSL that compiles and links in WebGL2',
  async (name) => {
    const field = generateField(PRESETS[name])
    const result = await compile(VERTEX, assembleFragment(field))
    if (!result.ok) {
      throw new Error(`[${name}] ${result.stage} failed:\n${result.log}\n\n--- field() ---\n${field}`)
    }
    expect(result.ok).toBe(true)
  },
  60_000,
)
