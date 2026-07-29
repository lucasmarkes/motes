import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32, valueX, expand, placementComplaints, makeKnotPath } from './tune-lib.mjs'

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

const ANCHORS = {
  controls: {
    contrast: { x: 700, y: 500, width: 300, height: 40, cx: 850, cy: 520, min: 0, max: 3, value: 1 },
    brightness: { x: 700, y: 560, width: 300, height: 40, cx: 850, cy: 580, min: -0.5, max: 0.5, value: 0 },
  },
  buttons: {
    Paper: { x: 700, y: 700, width: 60, height: 30, cx: 730, cy: 715 },
    Randomize: { x: 780, y: 40, width: 90, height: 30, cx: 825, cy: 55 },
  },
}

test('expand passes a field keyframe through', () => {
  const { knots, events } = expand([{ t: 0, x: 180, y: 900 }], ANCHORS)
  assert.deepEqual(knots, [
    { t: 0, x: 180, y: 900, frozen: false, pressed: false, linear: false, zone: 'field', target: null },
  ])
  assert.deepEqual(events, [])
})

test('expand turns a drag into a straight, pressed span', () => {
  const { knots } = expand([{ t: 2, ctl: 'contrast', to: 2.4, over: 1 }], ANCHORS)
  assert.equal(knots.length, 2)
  // Presses on the thumb where it already is, so the value does not jump.
  assert.deepEqual(knots[0], {
    t: 2, x: 800, y: 520, frozen: false, pressed: true, linear: true, zone: 'panel', target: 'contrast',
  })
  assert.deepEqual(knots[1], {
    t: 3, x: 940, y: 520, frozen: false, pressed: false, linear: false, zone: 'panel', target: 'contrast',
  })
})

test('expand emits down and up for a drag', () => {
  const { events } = expand([{ t: 2, ctl: 'contrast', to: 2.4, over: 1 }], ANCHORS)
  assert.deepEqual(events, [{ t: 2, type: 'down' }, { t: 3, type: 'up' }])
})

test('expand freezes a click for its hold', () => {
  const { knots, events } = expand([{ t: 5, click: 'Paper', hold: 0.14 }], ANCHORS)
  assert.deepEqual(knots, [
    { t: 5, x: 730, y: 715, frozen: true, pressed: true, linear: false, zone: 'panel', target: 'Paper' },
    { t: 5.14, x: 730, y: 715, frozen: false, pressed: false, linear: false, zone: 'panel', target: 'Paper' },
  ])
  assert.deepEqual(events, [{ t: 5, type: 'down' }, { t: 5.14, type: 'up' }])
})

test('expand keeps knots in time order across mixed forms', () => {
  const { knots } = expand([
    { t: 0, x: 180, y: 900 },
    { t: 2, ctl: 'contrast', to: 2.4, over: 1 },
    { t: 5, click: 'Paper', hold: 0.14 },
  ], ANCHORS)
  assert.deepEqual(knots.map((k) => k.t), [0, 2, 3, 5, 5.14])
})

test('expand marks a via keyframe as travel', () => {
  const { knots } = expand([{ t: 1, x: 830, y: 545, via: true }], ANCHORS)
  assert.equal(knots[0].zone, 'travel')
})

test('expand names a control it cannot resolve', () => {
  assert.throws(
    () => expand([{ t: 1, ctl: 'radius', to: 200, over: 1 }], ANCHORS),
    /no control "radius"/,
  )
})

test('expand names a button it cannot resolve', () => {
  assert.throws(
    () => expand([{ t: 1, click: 'Reset', hold: 0.1 }], ANCHORS),
    /no button "Reset"/,
  )
})

const PLACED = {
  ...ANCHORS,
  panel: { x: 637, y: 13, width: 430, height: 1054 },
  scrim: { w: 734, h: 440 },
  frame: { width: 1080, height: 1080 },
}

const field = (t, x, y) => ({ t, x, y, frozen: false, pressed: false, linear: false, zone: 'field', target: null })

test('placementComplaints accepts a knot in the clear band', () => {
  assert.deepEqual(placementComplaints([field(0, 180, 900)], PLACED), [])
})

test('placementComplaints rejects a field knot under the panel', () => {
  const [msg] = placementComplaints([field(1, 800, 600)], PLACED)
  assert.match(msg, /t=1s \(800,600\) is under the panel/)
})

test('placementComplaints rejects a field knot under the title scrim', () => {
  // 100/734 + 100/440 = 0.363, well under the 0.85 the scrim stops biting at.
  const [msg] = placementComplaints([field(2, 100, 100)], PLACED)
  assert.match(msg, /is under the title scrim/)
})

test('placementComplaints rejects a field knot close enough to clip the arrow', () => {
  const [msg] = placementComplaints([field(3, 8, 900)], PLACED)
  assert.match(msg, /would clip against the frame edge/)
})

test('placementComplaints accepts a panel knot inside its own control', () => {
  const onTrack = { t: 4, x: 800, y: 520, frozen: false, pressed: true, linear: true, zone: 'panel', target: 'contrast' }
  assert.deepEqual(placementComplaints([onTrack], PLACED), [])
})

test('placementComplaints rejects a panel knot that has slid off its control', () => {
  const offTrack = { t: 5, x: 1050, y: 520, frozen: false, pressed: true, linear: true, zone: 'panel', target: 'contrast' }
  const [msg] = placementComplaints([offTrack], PLACED)
  assert.match(msg, /t=5s \(1050,520\) is outside contrast/)
})

test('placementComplaints rejects a panel knot that has slid off its button', () => {
  const offButton = { t: 6, x: 900, y: 715, frozen: true, pressed: true, linear: false, zone: 'panel', target: 'Paper' }
  const [msg] = placementComplaints([offButton], PLACED)
  assert.match(msg, /is outside Paper/)
})

test('placementComplaints lets a travel knot cross the panel', () => {
  const via = { t: 7, x: 800, y: 640, frozen: false, pressed: false, linear: false, zone: 'travel', target: null }
  assert.deepEqual(placementComplaints([via], PLACED), [])
})

test('placementComplaints still holds a travel knot to the frame', () => {
  const via = { t: 8, x: 1078, y: 640, frozen: false, pressed: false, linear: false, zone: 'travel', target: null }
  const [msg] = placementComplaints([via], PLACED)
  assert.match(msg, /would clip against the frame edge/)
})

test('placementComplaints reports every bad knot, not just the first', () => {
  assert.equal(placementComplaints([field(1, 800, 600), field(2, 100, 100)], PLACED).length, 2)
})

const straight = [
  { t: 0, x: 0, y: 100, frozen: false, pressed: false, linear: false, zone: 'field', target: null },
  { t: 1, x: 100, y: 100, frozen: false, pressed: true, linear: true, zone: 'panel', target: 'contrast' },
  { t: 2, x: 300, y: 100, frozen: false, pressed: false, linear: false, zone: 'panel', target: 'contrast' },
  { t: 3, x: 200, y: 400, frozen: false, pressed: false, linear: false, zone: 'field', target: null },
]

test('makeKnotPath lands exactly on its knots', () => {
  const path = makeKnotPath(straight, 4)
  assert.equal(Math.round(path(1).x), 100)
  assert.equal(Math.round(path(2).x), 300)
})

test('makeKnotPath interpolates a linear span in a straight line', () => {
  const path = makeKnotPath(straight, 4)
  // Halfway through the drag: exactly halfway along it, and no vertical bow.
  assert.equal(Math.round(path(1.5).x), 200)
  assert.equal(Math.round(path(1.5).y), 100)
})

test('makeKnotPath reports pressed across a drag and not after it', () => {
  const path = makeKnotPath(straight, 4)
  assert.equal(path(1.0).pressed, true)
  assert.equal(path(1.5).pressed, true)
  assert.equal(path(2.5).pressed, false)
})

test('makeKnotPath holds a frozen knot still and pressed', () => {
  const held = [
    { t: 0, x: 0, y: 0, frozen: false, pressed: false, linear: false, zone: 'field', target: null },
    { t: 1, x: 50, y: 50, frozen: true, pressed: true, linear: false, zone: 'panel', target: 'Paper' },
    { t: 1.2, x: 50, y: 50, frozen: false, pressed: false, linear: false, zone: 'panel', target: 'Paper' },
  ]
  const path = makeKnotPath(held, 2)
  assert.deepEqual(path(1.1), { x: 50, y: 50, pressed: true })
})

test('makeKnotPath closes the loop — position matches across the seam', () => {
  const path = makeKnotPath(straight, 4)
  const a = path(0)
  const b = path(4)
  assert.equal(Math.round(a.x), Math.round(b.x))
  assert.equal(Math.round(a.y), Math.round(b.y))
})

test('makeKnotPath has matching velocity across the seam', () => {
  const path = makeKnotPath(straight, 4)
  const dt = 1 / 600
  const before = path(4 - dt)
  const after = path(dt)
  const vIn = (path(0).x - before.x) / dt
  const vOut = (after.x - path(0).x) / dt
  assert.ok(Math.abs(vIn - vOut) < 1, `velocity jumps by ${Math.abs(vIn - vOut)}`)
})
