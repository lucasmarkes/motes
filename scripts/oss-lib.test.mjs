import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normaliseBrandSvg } from './oss-lib.mjs'

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
