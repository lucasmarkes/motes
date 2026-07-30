import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { maskAlpha, normaliseBrandSvg, revealComplaints, revealEnvelope } from './oss-lib.mjs'

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

test('maskAlpha bottoms out at black and tops out at white', () => {
  assert.equal(maskAlpha(0), 0)
  assert.equal(maskAlpha(1), 1)
})

test('maskAlpha holds the ambient field below the floor at zero', () => {
  assert.equal(maskAlpha(0.02), 0, 'ambient glyphs would leak the whole lockup')
  assert.equal(maskAlpha(0.06), 0)
  assert.ok(maskAlpha(0.07) > 0, 'just above the floor has to start lighting')
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
  assert.ok(maskAlpha(0.5) > 0.5)
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
