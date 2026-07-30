/**
 * The pure parts of the `--oss` scene: everything that is a function of numbers
 * or strings rather than of a live page.
 *
 * Two of these — `maskAlpha` and `revealEnvelope` — are stringified into the
 * card page rather than copied into it, for the reason `INSTALL_RANDOM` gives:
 * an init script is serialised away from node's module scope, so a closure over
 * a module-level function arrives undefined. Stringifying keeps one definition
 * of each, and that definition is the one the tests exercise.
 */

/** The wordmark's own fill, which is a CSS variable on Mintlify's site. */
const TEXT_VAR = /fill="var\(--color-text-main\)"/g

/**
 * Mintlify's lockup, made usable in a page that is not Mintlify's site.
 *
 * Chromium does not resolve `var()` inside an SVG presentation attribute, so
 * the wordmark paths — which are filled with `var(--color-text-main)` — render
 * as nothing and the file looks like a leaf with no name next to it. The
 * substitution is what fixes that; the two assertions either side of it are
 * what stop a silently wrong file being shipped in a video.
 */
export function normaliseBrandSvg(source, ink = '#EEF2F0') {
  if (!source.trimStart().startsWith('<svg')) {
    throw new Error('[oss] the brand asset is not an SVG')
  }
  if (!source.includes('#18E299')) {
    throw new Error('[oss] the brand asset has no #18E299 leaf colour — wrong file, or a redraw')
  }

  const inked = source.replace(TEXT_VAR, `fill="${ink}"`)
  if (inked.includes('var(--')) {
    throw new Error(
      '[oss] the brand asset still carries a CSS variable, which Chromium will not resolve ' +
        'in a presentation attribute — the wordmark would render invisible',
    )
  }

  // Sized by CSS in the card, so the intrinsic attributes only fight it. The
  // viewBox is deliberately kept: it is what makes the file scalable at all.
  return inked
    .replace(/^(<svg[^>]*?)\swidth="[^"]*"/, '$1')
    .replace(/^(<svg[^>]*?)\sheight="[^"]*"/, '$1')
}

/**
 * Field luminance to mask opacity.
 *
 * `floor` is what keeps the ambient field from leaking the lockup. The field is
 * never truly black — the dim cells still sit a few percent above the
 * background — so a curve through the origin would show the whole lockup
 * faintly from frame 0 and give away the reveal.
 *
 * The curve above the floor is `1 - (1 - t)^gain`, which is monotonic, hits
 * both endpoints exactly, and lifts the midtones. That last part matters: the
 * pointer's halo falls off smoothly, so a linear map fades the type out well
 * inside the lit region and the letters read as shy rather than as lit.
 */
export function maskAlpha(luma, floor = 0.06, gain = 2.4) {
  if (luma <= floor) return 0
  const t = Math.min(1, (luma - floor) / (1 - floor))
  return 1 - (1 - t) ** gain
}

/**
 * The mask opening, from halo to full frame.
 *
 * Cubic ease-out rather than ease-in-out: the opening is the moment the video
 * stops asking a question and answers it, and an ease-in would put the slow
 * part at the front, where it reads as hesitation. Out of the mark fast, then
 * settling into the hold, is the shape of something arriving.
 */
export function revealEnvelope(t, openAt, openFor) {
  if (t <= openAt) return 0
  if (t >= openAt + openFor) return 1
  const u = (t - openAt) / openFor
  return 1 - (1 - u) ** 3
}

/** Euclidean distance from a point to a box, zero when the point is inside it. */
function distanceToBox(p, b) {
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w))
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h))
  return Math.hypot(dx, dy)
}

function inside(p, b) {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
}

/**
 * That the choreography actually reveals what the video is about.
 *
 * The mask is the pointer's own halo, so a mark the cursor never approaches is
 * a mark that never appears — a failure with no visible symptom in any single
 * frame, and one that a still of the held beat would not show either, because
 * by then the mask is fully open. So this is checked against the curve rather
 * than the keyframes, for the same reason `guardHome` is: a non-uniform
 * Catmull-Rom can pass wide of a knot on the outside of a turn.
 *
 * The rest check is the other half. During the held beat the arrow is parked on
 * screen for two and a half seconds, and if it parks on the lockup it sits over
 * the one frame everybody screenshots.
 */
export function revealComplaints(sample, duration, boxes, { radius, restAt, fps = 60 }) {
  const marks = [
    ['motes', boxes.motes],
    ['mintlify', boxes.mint],
  ]
  const nearest = new Map(marks.map(([name]) => [name, Infinity]))

  const frames = Math.round(duration * fps)
  for (let f = 0; f < frames; f++) {
    const p = sample(f / fps)
    for (const [name, box] of marks) {
      nearest.set(name, Math.min(nearest.get(name), distanceToBox(p, box)))
    }
  }

  const bad = []
  for (const [name] of marks) {
    const d = nearest.get(name)
    if (d > radius) {
      bad.push(
        `the cursor never comes within ${radius}px of ${name} — closest is ${Math.round(d)}px, ` +
          'so that mark never lights',
      )
    }
  }

  const rest = sample(restAt)
  if (!inside(rest, boxes.rest)) {
    bad.push(
      `at ${restAt}s the cursor is at ${Math.round(rest.x)},${Math.round(rest.y)}, outside the rest box — ` +
        'the held beat would have the arrow sitting on the type',
    )
  }

  return { bad, nearest: Object.fromEntries(nearest) }
}
