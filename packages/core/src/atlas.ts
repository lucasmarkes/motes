export const MONO_STACK =
  'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace'

export interface GlyphAtlas {
  canvas: HTMLCanvasElement
  /** Number of glyphs in the strip. */
  count: number
  /** Per-glyph cell size in the atlas, in device px. */
  cellW: number
  cellH: number
}

export function validateCharset(charset: string): string {
  if (charset.length < 2) {
    throw new Error('[motes] charset must contain at least 2 characters')
  }
  if (charset[0] !== ' ') {
    throw new Error('[motes] charset index 0 must be a space')
  }
  return charset
}

/**
 * Render the charset to an offscreen canvas as a horizontal strip, one
 * monospace glyph per cell, white on transparent — coverage lives in alpha.
 *
 * Cells are sized in device pixels to match the on-screen grid 1:1, so glyphs
 * sample without resampling blur. Regenerate whenever charset, density or DPR
 * changes; that is what keeps `charset` fully dynamic from a prop.
 */
export function buildGlyphAtlas(
  charset: string,
  cellW: number,
  cellH: number,
  dpr: number,
): GlyphAtlas {
  const count = charset.length
  const w = Math.max(1, Math.round(cellW * dpr))
  const h = Math.max(1, Math.round(cellH * dpr))

  const canvas = document.createElement('canvas')
  canvas.width = w * count
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('[motes] could not acquire a 2D context for the glyph atlas')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // Font size tracks cell height, matching the prototype's `dens + 'px'`.
  ctx.font = `${cellH * dpr}px ${MONO_STACK}`
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffffff'

  for (let i = 0; i < count; i++) {
    const glyph = charset[i]
    if (!glyph || glyph === ' ') continue
    ctx.fillText(glyph, i * w, 0)
  }

  return { canvas, count, cellW: w, cellH: h }
}
