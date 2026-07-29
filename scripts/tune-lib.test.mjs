import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32, valueX } from './tune-lib.mjs'

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(0x9e3779b9)
  const b = mulberry32(0x9e3779b9)
  const first = [a(), a(), a(), a(), a()]
  const second = [b(), b(), b(), b(), b()]
  assert.deepEqual(first, second)
})

test('mulberry32 stays inside [0, 1)', () => {
  const rand = mulberry32(1)
  for (let i = 0; i < 10_000; i++) {
    const v = rand()
    assert.ok(v >= 0 && v < 1, `got ${v}`)
  }
})

test('mulberry32 does not repeat itself immediately', () => {
  const rand = mulberry32(7)
  const seen = new Set()
  for (let i = 0; i < 1000; i++) seen.add(rand())
  assert.equal(seen.size, 1000)
})

// Serialised into the page, so it must not reference anything outside itself.
test('mulberry32 survives round-tripping through its own source', () => {
  const rebuilt = new Function(`return (${mulberry32.toString()})`)()
  const a = mulberry32(42)
  const b = rebuilt(42)
  assert.deepEqual([a(), a(), a()], [b(), b(), b()])
})

const CONTRAST = { x: 100, width: 300, min: 0, max: 3 }

test('valueX puts the minimum at the left edge and the maximum at the right', () => {
  assert.equal(valueX(CONTRAST, 0), 100)
  assert.equal(valueX(CONTRAST, 3), 400)
})

test('valueX is linear between the bounds', () => {
  assert.equal(valueX(CONTRAST, 1), 200)
  assert.equal(valueX(CONTRAST, 2.4), 340)
})

test('valueX handles a range that starts below zero', () => {
  const brightness = { x: 0, width: 200, min: -0.5, max: 0.5 }
  assert.equal(valueX(brightness, 0), 100)
  assert.equal(valueX(brightness, 0.22), 144)
})

test('valueX clamps a value outside the range onto the track', () => {
  assert.equal(valueX(CONTRAST, -5), 100)
  assert.equal(valueX(CONTRAST, 99), 400)
})
