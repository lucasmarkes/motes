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
