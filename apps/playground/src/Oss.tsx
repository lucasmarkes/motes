/* ---------------------------------------------------------------------------
   PROTOTYPE — the OSS chip.

   A pill above the headline carrying the install row's material at two-thirds
   the height, with a single light that travels the chip's own outline — along
   the top, round the cap, back along the bottom — at a constant rate, forever,
   with no pause between laps.

   The light is stroked onto an SVG copy of the outline rather than painted
   into the border as a conic gradient, because `stroke-dashoffset` is measured
   along the path and an angle is not. See oss.css.

   What remains before this ships: OSS_HREF below, and the accent question
   noted against styles.css:46. Then this file's contents move into Index.tsx /
   styles.css and it goes away.
--------------------------------------------------------------------------- */

import './oss.css'

/** Where the chip points. Placeholder until the real programme URL is known. */
const OSS_HREF = 'https://mintlify.com/'

/* The mark, lifted from assets/brand/mintlify.svg. The leaf alone, squared out
   of the 104×24 lockup box. It keeps its own two greens — they are the whole
   reason the chip reads as somebody else's programme and not as a fourth
   thing this page invented. */
function MintlifyLeaf() {
  return (
    <svg className="oss-leaf" viewBox="0 0 19 22" fill="none" aria-hidden="true">
      <path
        d="M18.4725 9.60528V3.91396C18.4725 3.30323 17.977 2.81641 17.3754 2.81641H11.6867C10.7931 2.81641 9.90842 2.99342 9.08564 3.32977C8.26285 3.67497 7.51085 4.17064 6.88271 4.80793L6.83847 4.85219C6.00684 5.69305 5.41408 6.73749 5.11328 7.88815C5.65296 7.74653 6.2103 7.67572 6.76767 7.66687C8.25399 7.64916 9.71378 8.12713 10.8993 9.02111C11.9698 9.81771 12.7837 10.9153 13.2261 12.181C13.6861 13.4644 13.7392 14.8629 13.3942 16.1817C14.5354 15.8808 15.5883 15.2878 16.4288 14.4558L16.473 14.4115C17.1011 13.7831 17.6054 13.0307 17.9504 12.2075C18.2955 11.3844 18.4636 10.4993 18.4636 9.60528H18.4725Z"
        fill="#18E299"
      />
      <path
        d="M4.9434 9.50941C4.95221 7.76347 5.64849 6.08807 6.87361 4.83594L2.14058 9.57113C2.12296 9.58876 2.10532 9.59758 2.08769 9.61522C0.933084 10.7615 0.23681 12.2959 0.122231 13.9183C0.0164654 15.435 0.413078 16.934 1.2592 18.1862C1.33991 18.3056 1.5589 18.3449 1.68229 18.2303L4.58202 15.338C5.48985 14.4298 5.7719 13.0806 5.34002 11.8726C5.06679 11.1231 4.93459 10.3207 4.9434 9.50941Z"
        fill="#0C8C5E"
      />
      <path
        d="M16.4445 14.4121C15.5367 15.3027 14.3997 15.92 13.1658 16.1933C11.923 16.4667 10.6362 16.3873 9.43757 15.9641C9.43757 15.9641 9.42874 15.9641 9.41992 15.9641C8.21243 15.532 6.86394 15.8141 5.95612 16.7136L3.05634 19.6058C2.93295 19.7293 2.95057 19.9321 3.10041 20.0291C4.35197 20.8668 5.85035 21.2724 7.36632 21.1666C8.98806 21.052 10.5128 20.3553 11.6674 19.2002L11.7115 19.1561L16.4445 14.4209V14.4121Z"
        fill="#0C8C5E"
      />
    </svg>
  )
}

/* What the light should look like, head to tail, as fractions of full
   strength. This is the thing to edit — the alphas below are derived.

   The taper is nine strokes of the same outline at different lengths, so any
   point on the arc is covered by every stroke at least as long as its distance
   from the head. Overlapping alpha composites to 1 − Π(1 − aᵢ), which is why a
   single shared opacity cannot be raised to brighten this: at a uniform a the
   ramp is 1 − (1 − a)ⁿ, and pushing the head to 1 drives every rung to 1 with
   it. The taper would flatten into a solid bar of light.

   So state the ramp and solve for the strokes instead. */
const RAMP = [1, 0.82, 0.64, 0.48, 0.34, 0.23, 0.14, 0.07, 0.03]

/* How far back each stroke reaches, head first, in units of the outline's 100.

   The last of these is the number that matters and it is bounded by the shape,
   not by taste. This chip's outline is 400px: two 158px flats and two 44px
   caps. A streak longer than a cap is on both flats at once for the whole of
   every corner, and a lit top edge plus a lit bottom edge does not read as one
   light turning — it reads as two lights chasing. At 16 units the streak is
   64px, so rounding a cap costs it about 10px on each flat and it stays
   legible as a single thing going round.

   Nine rungs rather than six because the taper is made of the seams between
   them, and six across a curve this steep left steps you could count. Each is
   another `<rect>`, which is the cheapest thing here. */
const TAIL = [2, 3.5, 5, 7, 9, 11, 13, 14.5, 16]

/* Zone k is covered by every stroke from k outward, so the stroke that first
   reaches zone k has to supply exactly the step from ramp[k+1] to ramp[k]
   against what is already there:

     1 − (1 − aₖ)·(1 − ramp[k+1]) = ramp[k]

   The outermost stroke has nothing under it and simply carries the tail's own
   value. Note aₖ hits 1 for a ramp that starts at 1 — the head stroke is
   opaque, which is what "full strength" asks for. */
function stackAlphas(ramp: number[]): number[] {
  return ramp.map((v, k) => {
    const under = ramp[k + 1]
    return under === undefined ? v : 1 - (1 - v) / (1 - under)
  })
}

/** Each tail length paired with the alpha solved for its place in the ramp.
    Both lists are RAMP-length by construction — the guard is the price of
    indexing under `noUncheckedIndexedAccess`, not a case that happens. */
function rungs(): { len: number; alpha: number }[] {
  const alphas = stackAlphas(RAMP)
  return TAIL.flatMap((len, i) => {
    const alpha = alphas[i]
    return alpha === undefined ? [] : [{ len, alpha }]
  })
}

/**
 * The light, as copies of the chip's own outline.
 *
 * Each rect carries the same dash offset, so they all share one leading edge
 * and differ only in how far back they extend. Stacked, the overlap does the
 * tapering. That is why this is nine elements and not one with a gradient — a
 * stroke cannot be shaded along its own direction of travel, but nine strokes
 * of different lengths can fake it exactly.
 *
 * `pathLength={100}` restates the perimeter as 100 units whatever the chip's
 * real width, so every number above is a percentage of the outline and none of
 * this depends on how wide the browser renders the label.
 */
function RimLight() {
  // Both radii, stated. `rx="999" ry="auto"` does NOT give a stadium: SVG
  // resolves ry to rx and then clamps each against a different axis — rx to
  // half the width, ry to half the height — so a wide chip comes out
  // lens-cornered rather than round. 13.5 is half of the 28px chip height less
  // the 1px the outline is inset by; it tracks `--oss-h` in oss.css by hand.
  const r = 13.5
  const box = { x: '0', y: '0', width: '100%', height: '100%', rx: r, ry: r }

  return (
    <svg className="oss-rim" aria-hidden="true">
      {/* The soft field the light throws onto the page behind it. Not part of
          the ramp — it is wider, blurred past having an edge, and exists to
          put the light *on* the page rather than only on the chip. Shorter
          than the tail so it hugs the bright end rather than smearing the
          whole streak. */}
      <rect className="oss-halo" {...box} pathLength={100} strokeDasharray="12 88" />
      {rungs().map(({ len, alpha }) => (
        <rect
          key={len}
          className="oss-step"
          {...box}
          pathLength={100}
          strokeDasharray={`${len} ${100 - len}`}
          strokeOpacity={alpha.toFixed(3)}
        />
      ))}
    </svg>
  )
}

/**
 * The chip, in a slot of its own.
 *
 * The wrapper takes the hero's entrance so the chip never has to. `.hero-copy
 * > *` names an animation for every direct child and `animation-name` holds
 * one value, so anything the chip itself animates would cancel against it.
 * Nothing does today — the light lives on the rects inside — but the entrance
 * is a standing claim on whichever element is that child, and this keeps the
 * chip out of its way.
 */
export function OssChip() {
  return (
    <div className="oss-slot">
      <a className="oss-chip" href={OSS_HREF} target="_blank" rel="noreferrer">
        <RimLight />
        <MintlifyLeaf />
        <span>mintlify oss program</span>
      </a>
    </div>
  )
}
