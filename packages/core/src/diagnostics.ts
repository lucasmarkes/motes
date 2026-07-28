/**
 * Two CSS traps turn a working renderer into a blank page, and both look like
 * bugs in motes. This is the pure detector for them. It takes measurements, not
 * a DOM node: jsdom has no layout engine, so a node-based check could only be
 * tested in a browser. The caller reads the DOM; the logic here is pure and
 * unit-tested exhaustively.
 *
 * Every message has three parts, in order: what is wrong, why the CSS does
 * that, and the literal edit to make — plus its own escape hatch. A message
 * that stops at "what is wrong" is the failure mode we are patching.
 */

import type { RGB, RGBA } from './color'

export type Diagnosis = { code: 'unsized' | 'occluded' | 'washed'; message: string } | null

export interface DiagnosticInput {
  clientWidth: number
  clientHeight: number
  position: string
  left: string
  right: string
  top: string
  bottom: string
  zIndex: string
  containerWidth: number
  containerHeight: number
  htmlBg: string
  bodyBg: string
  quiet: boolean
}

/** The intrinsic size of a `<canvas>` with no CSS box. */
const INTRINSIC_W = 300
const INTRINSIC_H = 150

/**
 * A background is opaque unless it is absent or fully transparent.
 * `getComputedStyle` reports transparency as `rgba(…, 0)`, never the keyword,
 * so the alpha channel is the only signal that matters.
 */
function isOpaque(bg: string): boolean {
  if (!bg || bg === 'transparent') return false
  const inner = bg.match(/^rgba?\(([^)]+)\)/)?.[1]
  if (inner) {
    const parts = inner.split(',').map((s) => s.trim())
    if (parts.length < 4) return true
    const alpha = parts[3]
    return alpha !== undefined && Number.parseFloat(alpha) > 0
  }
  // A hex, named, or hsl colour reached us — present means opaque.
  return true
}

const UNSIZED_MESSAGE =
  '[motes] Canvas is 300×150 — the <canvas> intrinsic size, not the box you ' +
  'pinned it to. `inset: 0` does not stretch a replaced element: with ' +
  '`width: auto` the inset equation is over-constrained, so the intrinsic ' +
  'size wins.\n' +
  '  Fix: add `h-full w-full`, or `width: 100%; height: 100%`.\n' +
  '  Deliberate? Silence with <canvas data-motes-quiet>.'

const OCCLUDED_MESSAGE =
  '[motes] Canvas is drawing but painted behind an opaque background — ' +
  'z-index is negative and both <html> and <body> have a background colour. ' +
  "Once <html> has its own background, <body>'s stops propagating to the " +
  'viewport and paints as an ordinary block background, above any negative ' +
  'z-index.\n' +
  '  Fix: remove `background` from either <html> or <body> — keeping it on ' +
  'exactly one is enough. Or drop the negative z-index and layer content ' +
  'above instead.\n' +
  '  Deliberate? Silence with <canvas data-motes-quiet>.'

export function diagnose(input: DiagnosticInput): Diagnosis {
  if (input.quiet) return null

  // Mode A — never sized. Only the full fingerprint fires, so a deliberately
  // small (position: static) or deliberately pinned (right/left: auto) canvas
  // is left alone. `inset: 0` sets left and right both non-auto with width
  // auto: the over-constrained case where the intrinsic size wins.
  const isIntrinsic =
    input.clientWidth === INTRINSIC_W && input.clientHeight === INTRINSIC_H
  const isPinned = input.position === 'absolute' || input.position === 'fixed'
  const overConstrained = input.left !== 'auto' && input.right !== 'auto'
  const containerBigger =
    input.containerWidth > INTRINSIC_W || input.containerHeight > INTRINSIC_H

  if (isIntrinsic && isPinned && overConstrained && containerBigger) {
    return { code: 'unsized', message: UNSIZED_MESSAGE }
  }

  // Mode B — occluded. Ship only the deterministic case the matrix measured:
  // negative z with both <html> and <body> opaque. The opaque-intermediate-
  // ancestor case is real but conditional on whether that ancestor establishes
  // a stacking context (measured: it occludes only when it does NOT), and the
  // documented `fixed` snippet never hits it. Detecting it would mean
  // replicating the stacking-context algorithm, whose wrong answer is a false
  // positive — the one failure this feature cannot afford.
  //
  // Not elementFromPoint: our own recommended snippet sets
  // `pointer-events: none`, so it would never return the canvas and would
  // false-positive on every correct install.
  const z = Number.parseInt(input.zIndex, 10)
  const negativeZ = Number.isFinite(z) && z < 0

  if (negativeZ && isOpaque(input.htmlBg) && isOpaque(input.bodyBg)) {
    return { code: 'occluded', message: OCCLUDED_MESSAGE }
  }

  return null
}

/** WCAG relative luminance. The inputs are already normalised sRGB. */
function channelLuminance(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance([r, g, b]: RGB): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  )
}

/**
 * Deliberately far below WCAG's 4.5:1.
 *
 * That bar is for text you must read; this is a decorative field, and the
 * shipped default measures about 4.7:1 at the bright end of its ramp while the
 * dim end sits far lower on purpose. A field at 2:1 is a legitimate subtle
 * look, not a mistake. 1.5:1 is the line where nothing is on screen at all.
 */
const MIN_RATIO = 1.5

const WASHED_MESSAGE =
  '[motes] The field is drawing, but `ink` and `background` are too close in ' +
  'luminance to see. The ambient ramp runs from the background toward `ink`, ' +
  'so when those two match there is nothing to render but the background.\n' +
  '  Fix: move `ink` away from `background` — light glyphs on a dark ' +
  'background, or dark on light.\n' +
  '  Deliberate? Silence with <canvas data-motes-quiet>.'

/**
 * Warn when the chosen palette cannot produce a visible glyph.
 *
 * Separate from `diagnose` because that function is about the DOM box, and
 * this is about resolved options — different inputs, different lifetime.
 * Skipped entirely for a non-opaque background: what sits behind the canvas
 * belongs to the host page, so any ratio computed here would be a guess.
 *
 * `background` arrives premultiplied (the pipeline premultiplies once, at
 * resolve time, and never straightens it back out). That only matters when
 * alpha is below 1 — and this function bails before touching the colour in
 * that case — so the luminance maths below never sees a premultiplied value
 * at anything other than alpha 1, where premultiplied and straight are the
 * same numbers.
 */
export function diagnoseContrast(
  background: RGBA,
  ink: RGB,
  quiet: boolean,
): Diagnosis {
  if (quiet) return null
  if (background[3] < 1) return null

  const a = relativeLuminance([background[0], background[1], background[2]])
  const b = relativeLuminance(ink)
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

  return ratio < MIN_RATIO ? { code: 'washed', message: WASHED_MESSAGE } : null
}
