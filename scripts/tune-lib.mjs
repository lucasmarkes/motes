/**
 * The parts of the `--tune` scene that do not need a browser.
 *
 * Split out for one reason: the choreography is the artefact, and the maths
 * under it — where a value sits on a track, which keyframes are legal, what a
 * seeded roll produces — is worth being able to test in a tenth of a second
 * rather than behind a ninety-second render.
 */

/**
 * A seeded PRNG, to stand in for `Math.random` inside the page.
 *
 * `randomize()` in the playground samples every numeric control and then
 * picks a charset and a preset (`config/actions.ts`). On the real
 * `Math.random` that makes the take non-reproducible, which would end the
 * determinism the whole rig is built on, and it can roll the field into
 * Terminal or Amber — presets the video deliberately does not use.
 *
 * mulberry32 because it is one line of state, passes the tests a demo needs,
 * and — the operative property — is short enough to serialise. This function
 * is stringified with `.toString()` and injected into the page in `video.mjs`,
 * so it must close over nothing at all.
 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The client x at which a slider's value sits.
 *
 * `Slider.tsx` maps a press absolutely: `rawFromClientX` reads
 * `min + ((clientX - rect.left) / rect.width) * (max - min)`, clamped. So the
 * inverse is plain linear interpolation across the measured `.track-hit`.
 *
 * The one distortion is the detent — `geometry.ts` slows the value within
 * eight pixels of the control's baseline, so a target inside that well lands
 * short. Every target this scene uses is far outside it, and the render
 * asserts the landed value against `aria-valuenow`, so a future target that
 * strays into the well fails the render rather than shipping off-key.
 */
export function valueX(track, value) {
  const { x, width, min, max } = track
  const span = max - min
  const t = span === 0 ? 0 : (value - min) / span
  return x + width * Math.min(1, Math.max(0, t))
}

/** A knot with every field present, so callers never branch on undefined. */
function knot({ t, x, y, frozen = false, pressed = false, linear = false, zone, target = null }) {
  return { t, x, y, frozen, pressed, linear, zone, target }
}

/**
 * The authored choreography, resolved against measured geometry.
 *
 * Three keyframe forms, because the cursor does three things: it moves over
 * the field, it holds a slider and travels, and it presses a button. Only the
 * first is written as coordinates. The other two name what they are aiming at
 * and the rect is read from the live DOM, so a panel that reflows fails the
 * render instead of clicking whatever has moved into that pixel.
 *
 * `pressed` describes the interval *starting* at a knot, matching how the
 * sampler reads state from the earlier of the pair it is between. So a drag's
 * closing knot is already released — the up belongs to what comes next.
 */
export function expand(keys, anchors) {
  const knots = []
  const events = []

  for (const k of keys) {
    if (k.ctl !== undefined) {
      const track = anchors.controls[k.ctl]
      if (!track) throw new Error(`no control "${k.ctl}"`)
      const end = k.t + k.over
      // Pressing where the thumb already is: `onTrackDown` maps the press
      // absolutely, so a press anywhere else would fling the value there
      // before the travel had begun.
      knots.push(knot({ t: k.t, x: valueX(track, track.value), y: track.cy, pressed: true, linear: true, zone: 'panel', target: k.ctl }))
      knots.push(knot({ t: end, x: valueX(track, k.to), y: track.cy, zone: 'panel', target: k.ctl }))
      events.push({ t: k.t, type: 'down' }, { t: end, type: 'up' })
      continue
    }

    if (k.click !== undefined) {
      const b = anchors.buttons[k.click]
      if (!b) throw new Error(`no button "${k.click}"`)
      const end = k.t + k.hold
      knots.push(knot({ t: k.t, x: b.cx, y: b.cy, frozen: true, pressed: true, zone: 'panel', target: k.click }))
      knots.push(knot({ t: end, x: b.cx, y: b.cy, zone: 'panel', target: k.click }))
      events.push({ t: k.t, type: 'down' }, { t: end, type: 'up' })
      continue
    }

    knots.push(knot({ t: k.t, x: k.x, y: k.y, zone: k.via ? 'travel' : 'field' }))
  }

  knots.sort((a, b) => a.t - b.t)
  events.sort((a, b) => a.t - b.t)
  return { knots, events }
}

/** How close to the frame edge the arrow may go before it clips. The cursor
 *  SVG is 26×40 with its tip at the origin, so the tip is what is bounded. */
const EDGE = 16

/**
 * Where the scrim has faded far enough to stop hiding the core. The gradient
 * runs 0.96 → 0 across its box, so the sum of the two normalised coordinates
 * is a good enough stand-in for "past the bright triangle" — the same rule
 * `assertClear` uses, kept so the two scenes stay comparable.
 */
const SCRIM_CLEAR = 0.85

const within = (k, r) =>
  k.x >= r.x && k.x <= r.x + r.width && k.y >= r.y && k.y <= r.y + r.height

/**
 * Keyframes that would put the cursor somewhere it should not be.
 *
 * The old rule was one-sided: stay out of the panel. That was right when the
 * panel was an opaque slab and the video was about the field. This take works
 * the controls, so "in the panel" is not the failure — being in the panel
 * without being on the thing you named is.
 */
export function placementComplaints(knots, anchors) {
  const bad = []
  const at = (k) => `t=${k.t}s (${Math.round(k.x)},${Math.round(k.y)})`

  for (const k of knots) {
    const { frame } = anchors
    if (k.x < EDGE || k.y < EDGE || k.x > frame.width - EDGE || k.y > frame.height - EDGE) {
      bad.push(`  ${at(k)} would clip against the frame edge`)
      continue
    }

    if (k.zone === 'travel') continue

    if (k.zone === 'panel') {
      const target = anchors.controls[k.target] ?? anchors.buttons[k.target]
      if (!target) {
        bad.push(`  ${at(k)} names ${k.target}, which is not a control or a button`)
      } else if (!within(k, target)) {
        bad.push(`  ${at(k)} is outside ${k.target}`)
      }
      continue
    }

    if (within(k, anchors.panel)) {
      bad.push(`  ${at(k)} is under the panel`)
      continue
    }
    if (k.x / anchors.scrim.w + k.y / anchors.scrim.h < SCRIM_CLEAR) {
      bad.push(`  ${at(k)} is under the title scrim`)
    }
  }

  return bad
}

/**
 * A closed, non-uniform Catmull-Rom through pre-expanded knots.
 *
 * The same curve `video.mjs`'s `makePath` draws, and for the same reasons:
 * closed so that position and velocity match across the loop point, and
 * non-uniform so the timing column carries the rhythm rather than an easing
 * parameter.
 *
 * Two things it does that the original does not. `pressed` is carried per
 * knot rather than implied by `frozen`, because a drag is pressed *and*
 * moving. And a span marked `linear` is interpolated as a straight line —
 * Catmull-Rom bows on the outside of a turn, and a drag sits between two
 * turns, so a splined drag walks the arrow off the track it is holding.
 */
export function makeKnotPath(knots, duration) {
  const n = knots.length

  return function sample(time) {
    const t = ((time % duration) + duration) % duration
    let i = n - 1
    while (i > 0 && knots[i].t > t) i--

    const a = knots[i]
    const b = i + 1 < n ? knots[i + 1] : { ...knots[0], t: knots[0].t + duration }
    if (a.frozen) return { x: a.x, y: a.y, pressed: true }

    const h = b.t - a.t
    const u = h <= 0 ? 0 : (t - a.t) / h
    const pressed = Boolean(a.pressed)

    if (a.linear) {
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, pressed }
    }

    // Neighbours, wrapped, so the seam has real tangents on both sides.
    const prev = i === 0
      ? { ...knots[n - 1], t: knots[n - 1].t - duration }
      : knots[i - 1]
    const next = i + 2 <= n - 1
      ? knots[i + 2]
      : { ...knots[(i + 2) % n], t: knots[(i + 2) % n].t + duration }

    const tangent = (p0, p1, axis) => (p1[axis] - p0[axis]) / (p1.t - p0.t)

    const hermite = (axis) => {
      const ma = a.frozen ? 0 : tangent(prev, b, axis)
      const mb = b.frozen ? 0 : tangent(a, next, axis)
      const u2 = u * u
      const u3 = u2 * u
      return (
        (2 * u3 - 3 * u2 + 1) * a[axis] +
        (u3 - 2 * u2 + u) * h * ma +
        (-2 * u3 + 3 * u2) * b[axis] +
        (u3 - u2) * h * mb
      )
    }

    return { x: hermite('x'), y: hermite('y'), pressed }
  }
}
