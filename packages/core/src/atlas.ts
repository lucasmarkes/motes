/**
 * Glyph atlas.
 *
 * Phase 1 renders the charset to an offscreen 2D canvas as a horizontal strip
 * of monospace glyphs — one cell per character, dark to bright — and uploads
 * it as a texture. Regenerated whenever `charset` changes, which is what keeps
 * the charset fully dynamic from a prop.
 */
export interface GlyphAtlas {
  canvas: HTMLCanvasElement
  /** Number of glyphs in the strip. */
  count: number
  /** Cell size in the atlas, in texels. */
  cell: number
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
