import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { maskAlpha, normaliseBrandSvg, revealEnvelope } from './oss-lib.mjs'

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
