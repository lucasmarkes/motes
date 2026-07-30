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
