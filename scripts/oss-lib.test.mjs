import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  dilateLuma,
  maskAlpha,
  MASK_CEIL,
  MASK_FLOOR,
  normaliseBrandSvg,
  revealComplaints,
  revealEnvelope,
  revealWindow,
} from './oss-lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const BRAND = readFileSync(join(here, '..', 'assets', 'brand', 'mintlify.svg'), 'utf8')

test('normaliseBrandSvg substitutes the CSS variable Chromium will not resolve', () => {
  const out = normaliseBrandSvg(BRAND, '#EEF2F0')
  assert.ok(!out.includes('var(--'), 'a CSS variable survived')
  assert.ok(out.includes('fill="#EEF2F0"'), 'the wordmark never got an ink colour')
})

test('normaliseBrandSvg leaves the leaf colours alone', () => {
  const out = normaliseBrandSvg(BRAND)
  assert.ok(out.includes('#18E299'), 'the light leaf lost its colour')
  assert.ok(out.includes('#0C8C5E'), 'the dark leaf lost its colour')
})

test('normaliseBrandSvg strips the intrinsic size so CSS can set it', () => {
  const out = normaliseBrandSvg(BRAND)
  assert.ok(!/<svg[^>]*\swidth=/.test(out), 'width survived on the root element')
  assert.ok(!/<svg[^>]*\sheight=/.test(out), 'height survived on the root element')
  assert.ok(out.includes('viewBox="0 0 104 24"'), 'the viewBox is what makes it scalable')
})

test('normaliseBrandSvg rejects a file that is not an SVG', () => {
  assert.throws(() => normaliseBrandSvg('<html></html>'), /not an SVG/)
})

test('normaliseBrandSvg rejects an SVG that is not the Mintlify lockup', () => {
  assert.throws(() => normaliseBrandSvg('<svg viewBox="0 0 1 1"></svg>'), /leaf colour/)
})

/**
 * Measured off the card at `density: 22` with `flow` running — the percentiles
 * of the mask buffer *after* `dilateLuma`, which is the buffer the curve is
 * applied to, and the numbers the constants are derived from. They live here
 * rather than in a comment because they are what the curve is *for*: if the
 * field's tuning changes enough to move them, these tests should fail.
 */
const FIELD = { p50: 0.153, p90: 0.31, p99: 0.535, peak: 0.706 }

/**
 * The lowest peak any frame's buffer reaches across 1.2–4.6s, while the halo is
 * the only thing revealing the type. Printed by `--oss` as `weakest halo across
 * the reveal`, and the number the ceiling has to clear.
 */
const WEAKEST_HALO = 0.466

test('maskAlpha bottoms out at black and tops out at white', () => {
  assert.equal(maskAlpha(0), 0)
  assert.equal(maskAlpha(1), 1)
})

test('maskAlpha hides the ambient field completely', () => {
  // The first version floored at 0.06, below the ambient median, and the lockup
  // was faintly legible everywhere the flow effect happened to be bright.
  assert.equal(maskAlpha(FIELD.p50), 0, 'the median field would leak the lockup')
  assert.equal(maskAlpha(FIELD.p90), 0, 'nine tenths of the frame is not the halo')
})

test('maskAlpha fully lights the pointer core', () => {
  assert.equal(maskAlpha(FIELD.peak), 1, 'the type has to be solid where the cursor is')
  // p99 is inside the core, not on its shoulder: the halo covers about a tenth
  // of the frame, so the top percentile is well within it.
  assert.equal(maskAlpha(FIELD.p99), 1, 'the top percentile of the buffer is halo')
})

test('maskAlpha saturates on the weakest halo of the whole reveal', () => {
  // The regression. With the ceiling above this number, the mark that happens
  // to be crossed over a sparse patch of field lights to about half while the
  // other goes solid — a reveal that reads as one of the two marks mattering
  // less, and nothing in a single frame says which decision caused it.
  assert.equal(maskAlpha(WEAKEST_HALO), 1, 'the weakest halo of the take does not light the type solid')
  assert.ok(MASK_CEIL < WEAKEST_HALO * 0.95, 'the ceiling has no margin under the weakest halo')
})

test('maskAlpha puts the halo shoulder in mid-reveal', () => {
  const shoulder = MASK_FLOOR + (MASK_CEIL - MASK_FLOOR) * 0.3
  const v = maskAlpha(shoulder)
  assert.ok(v > 0.2 && v < 0.9, `the shoulder of the halo should be part-lit, got ${v}`)
})

test('maskAlpha is monotonic', () => {
  let prev = -1
  for (let i = 0; i <= 100; i++) {
    const v = maskAlpha(i / 100)
    assert.ok(v >= prev, `dipped at luma ${i / 100}`)
    prev = v
  }
})

test('maskAlpha lifts the midtones above linear', () => {
  // The pointer halo falls off smoothly; a linear map would make the type fade
  // out long before the halo does, which reads as the letters being shy.
  const mid = (MASK_FLOOR + MASK_CEIL) / 2
  assert.ok(maskAlpha(mid) > 0.5, 'the middle of the ramp should be past half lit')
})

const N = 8

/** A lit patch built the way the field builds one: ink cells and paper cells. */
function checkerPatch(x0, y0, size, ink, paper) {
  const g = new Float64Array(N * N)
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      g[y * N + x] = (x + y) % 2 === 0 ? ink : paper
    }
  }
  return g
}

test('dilateLuma fills the paper between lit glyphs', () => {
  const g = checkerPatch(2, 2, 4, FIELD.peak, 0.02)
  const d = dilateLuma(g, N, 1)
  for (let y = 2; y < 6; y++) {
    for (let x = 2; x < 6; x++) {
      assert.equal(d[y * N + x], FIELD.peak, `cell ${x},${y} is still a hole in the lit region`)
    }
  }
})

test('dilateLuma turns a perforated mask solid', () => {
  // The regression, stated in the terms that matter. Half the cells of a lit
  // patch are the gaps between glyphs, and against a floor set above the
  // ambient p90 they mask to nothing — so the letterforms came back with the
  // field's own `*` and `#` punched through them, which is what a viewer sees
  // as the wordmarks being covered by the background rather than lit by it.
  const g = checkerPatch(2, 2, 4, FIELD.peak, 0.02)
  const patch = []
  for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) patch.push(y * N + x)

  assert.equal(patch.filter((i) => maskAlpha(g[i]) === 0).length, 8, 'the patch was not perforated to begin with')
  const d = dilateLuma(g, N, 1)
  assert.ok(patch.every((i) => maskAlpha(d[i]) === 1), 'the lit patch is still not solid')
})

test('dilateLuma never dims a cell', () => {
  const g = new Float64Array(N * N)
  for (let i = 0; i < g.length; i++) g[i] = ((i * 37) % 101) / 100
  const d = dilateLuma(g, N, 1)
  for (let i = 0; i < g.length; i++) assert.ok(d[i] >= g[i], `cell ${i} came back darker`)
})

test('dilateLuma spreads a lone sparkle by exactly its radius', () => {
  // The cost side of the trade. Ambient cells above the floor exist — p99 is
  // 0.44 — and each one grows to a 3×3 patch. That is affordable at radius 1
  // and is why the radius is not larger: the opening beat is supposed to flare
  // fragments of letterform, not resolve them.
  const g = new Float64Array(N * N)
  g[4 * N + 4] = FIELD.p99
  const d = dilateLuma(g, N, 1)
  assert.equal([...d].filter((v) => v > 0).length, 9)
})

test('dilateLuma clamps at the edges rather than wrapping', () => {
  const g = new Float64Array(N * N)
  g[3 * N] = FIELD.peak
  const d = dilateLuma(g, N, 1)
  assert.equal(d[3 * N + (N - 1)], 0, 'brightness wrapped around the frame')
})

test('revealEnvelope is shut before it opens and full after', () => {
  assert.equal(revealEnvelope(0, 4.6, 0.4), 0)
  assert.equal(revealEnvelope(4.6, 4.6, 0.4), 0)
  assert.equal(revealEnvelope(5.0, 4.6, 0.4), 1)
  assert.equal(revealEnvelope(8.0, 4.6, 0.4), 1)
})

test('revealEnvelope eases out, so the opening is fast then settles', () => {
  const mid = revealEnvelope(4.8, 4.6, 0.4)
  assert.ok(mid > 0.5, `expected an ease-out past halfway at the midpoint, got ${mid}`)
  assert.ok(mid < 1)
})

test('revealEnvelope is monotonic across the opening', () => {
  let prev = -1
  for (let i = 0; i <= 100; i++) {
    const v = revealEnvelope(4.6 + (0.4 * i) / 100, 4.6, 0.4)
    assert.ok(v >= prev, `dipped at ${i}%`)
    prev = v
  }
})

/** The take's own numbers, so these tests fail if the beats move under them. */
const TAKE = { openAt: 4.6, openFor: 0.4, closeAt: 7.4, closeFor: 0.6 }
const DURATION = 8
const OVERLAP = 0.6

test('revealWindow is shut before the open and full across the hold', () => {
  assert.equal(revealWindow(0, TAKE), 0)
  assert.equal(revealWindow(4.6, TAKE), 0)
  assert.equal(revealWindow(5.0, TAKE), 1)
  assert.equal(revealWindow(7.4, TAKE), 1)
})

test('revealWindow is shut across the whole dissolve overlap', () => {
  // The regression this exists for: `dissolveLoop` crossfades the frames past
  // the end back over the head, so frames 480–516 are composited on top of
  // frames 0–36. With the lockup still open at the end of the take, the loop
  // ghosted a fully legible `motes │ mintlify` over the opening beat at up to
  // 44% — the first 1.2s stopped withholding anything and the hook died. The
  // mask has to be shut at *both* ends of the crossfade, not just one.
  for (let f = DURATION * 60; f <= (DURATION + OVERLAP) * 60; f++) {
    const v = revealWindow(f / 60, TAKE)
    assert.ok(v < 1e-3, `frame ${f} would ghost the lockup over the head at ${v}`)
  }
})

test('revealWindow closes monotonically once the hold ends', () => {
  let prev = 2
  for (let i = 0; i <= 100; i++) {
    const v = revealWindow(TAKE.closeAt + (TAKE.closeFor * i) / 100, TAKE)
    assert.ok(v <= prev, `rose at ${i}%`)
    prev = v
  }
})

const BOXES = {
  motes: { x: 300, y: 500, w: 200, h: 90 },
  mint: { x: 580, y: 500, w: 240, h: 90 },
  rest: { x: 440, y: 700, w: 200, h: 120 },
}

/** A path that runs left to right through both marks and parks in the rest box. */
const good = (t) => (t < 4.6 ? { x: 250 + t * 130, y: 545 } : { x: 540, y: 760 })

test('revealComplaints passes a path that crosses both marks and parks', () => {
  const r = revealComplaints(good, 8, BOXES, { radius: 200, restAt: 6.0 })
  assert.deepEqual(r.bad, [])
  assert.equal(r.nearest.motes, 0, 'the path goes straight through motes')
  assert.equal(r.nearest.mintlify, 0, 'the path goes straight through mintlify')
})

test('revealComplaints catches a path that never reaches the second mark', () => {
  const short = (t) => (t < 4.6 ? { x: 250 + t * 20, y: 545 } : { x: 540, y: 760 })
  const r = revealComplaints(short, 8, BOXES, { radius: 100, restAt: 6.0 })
  assert.equal(r.bad.length, 1)
  assert.match(r.bad[0], /mintlify/)
  assert.match(r.bad[0], /never lights/)
})

test('revealComplaints catches a cursor resting on top of the type', () => {
  const parksOnType = (t) => (t < 4.6 ? { x: 250 + t * 130, y: 545 } : { x: 600, y: 540 })
  const r = revealComplaints(parksOnType, 8, BOXES, { radius: 200, restAt: 6.0 })
  assert.equal(r.bad.length, 1)
  assert.match(r.bad[0], /rest box/)
})

test('revealComplaints measures the closest approach, not just pass or fail', () => {
  const offBy = (t) => (t < 4.6
    ? { x: 250 + t * 130, y: 445 } // 55px above the marks' top edge
    : { x: 540, y: 760 })
  const r = revealComplaints(offBy, 8, BOXES, { radius: 200, restAt: 6.0 })
  assert.deepEqual(r.bad, [])
  assert.equal(r.nearest.motes, 55)
  assert.equal(r.nearest.mintlify, 55)
})
