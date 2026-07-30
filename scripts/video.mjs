#!/usr/bin/env node
/**
 * Render the launch video, and the README sweep loop, by driving the shipped
 * playground with a scripted cursor.
 *
 * Same argument as the OG card: the thing being advertised is that the cursor
 * is an input, so the footage is the library reacting to a real pointer rather
 * than an animation of one. What changes here is that a video has to hold that
 * claim for fifteen seconds, which means the *choreography* is the artefact —
 * so this file is written to be re-run and re-cut, and the two things that
 * make that possible are determinism and a fixed frame budget.
 *
 *   node scripts/video.mjs            # both deliverables, from the stage
 *   node scripts/video.mjs --home     # the homepage cut: 12s spot + 3s GIF
 *   node scripts/video.mjs --tune     # the 0.2.0 square cut: 18s at 1080²
 *   node scripts/video.mjs --probe    # 40 frames, twice, and diff them
 *   node scripts/video.mjs --sweep    # just the 3s GIF
 *   node scripts/video.mjs --no-encode
 *   node scripts/video.mjs --encode   # re-encode frames already on disk
 *
 * `--probe` takes whichever scene the other flags select, so `--tune --probe`
 * proves the square cut deterministic without waiting for 1080 frames.
 *
 * ── Three scenes
 *
 * `/flow` is the stage: the panel is in shot, and the cursor works the
 * controls. `/` is the homepage, and it is a different argument — no panel, no
 * controls, and the page's own headline in frame for the whole take, because
 * the thing autoplays muted and the headline is the only narration it gets.
 * The hero is sized from the viewport rather than being 720 tall, so that cut
 * chooses a viewport which makes it exactly 1280×720 and clips to it; see
 * `capture`.
 *
 * `--tune` is the third, added for 0.2.0, and it is the stage again at 1080×1080
 * for the feed — where a square earns about a third more height than 16:9 in
 * the same column. Two differences carry the rest of it. The choreography names
 * the control it is aiming at instead of a coordinate, so the rect comes from
 * the live DOM and a panel that reflows fails the render rather than clicking
 * whatever has moved into that pixel; and because the take presses Randomize,
 * `Math.random` is seeded, or the roll would be a different video every run and
 * free to land on a palette this cut does not use.
 *
 * ── Why the production build, served from here
 *
 * The dev server transforms modules on demand, so what it hands the browser is
 * not what a visitor gets. This serves `apps/playground/dist` — the same bytes
 * Vercel would — from an in-process static server with an SPA fallback, so
 * `/flow` resolves without a router config and without a second terminal.
 *
 * ── Why the clock is owned inside the page
 *
 * The field's clock is the rAF timestamp (`motes.ts:139`) and the pointer's
 * smoothing is re-anchored against elapsed time (`renderer/pointer.ts`), so
 * wall-clock jitter lands in the picture: at real time, two runs of the same
 * path produce different wakes, and a screenshot that takes 200ms to encode
 * shows up as a kink in the wake.
 *
 * The obvious fix is CDP's virtual time policy, and it does not work here.
 * Virtual time advances the clock but does not schedule one BeginFrame per
 * budget: measured, a 16⅔ms budget produced a single rAF across four budgets
 * on an idle page and up to twenty-one on this one. Since `stepPointer`'s
 * constants and the shader's wake term are both calibrated per 60Hz frame,
 * a wrong frame count is a wrong picture, not just a wrong duration.
 * `HeadlessExperimental.beginFrame` is the right primitive and needs a target
 * created with `enableBeginFrameControl`, which Playwright does not expose.
 *
 * So the clock is replaced in the page instead, before any of its own script
 * runs: rAF becomes a queue this file drains exactly once per frame with a
 * timestamp it chooses, and `performance.now` reads the same counter. One
 * `__tick(16.67)` is therefore one frame, by construction rather than by
 * hope, and dt is exactly 1/60 — the rate every constant in the library was
 * tuned at.
 *
 * CSS transitions are the one thing that does not run off rAF. They are Web
 * Animations, driven by a document timeline that cannot be replaced, so they
 * are pinned by hand each tick — otherwise the toggle's knob would slide on
 * wall-clock time and cross its whole 180ms travel inside a single captured
 * frame, which is to say it would teleport at exactly the moment the video is
 * asking you to look at it.
 *
 * `--probe` is what proves all of that rather than asserting it.
 *
 * ── Why the arrow sits at the raw pointer, not at the rendered core
 *
 * The OG card does the opposite, and deliberately: a still in which the arrow
 * is not on its own bright spot reads as a mistake, so that script measures
 * the core and puts the arrow there. In motion the lag is the subject. The
 * smoothed position trails the mouse by lerp 0.25, so during a flick the core
 * strings out behind the arrow tip — which is exactly what a pointer-reactive
 * field looks like, and what a viewer needs to see to believe the field is
 * chasing something. Drawing the arrow at the core would hide the very lag
 * that makes the wake legible. `--probe` measures the gap and prints it.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import ffmpeg from 'ffmpeg-static'
import { mulberry32, expand, placementComplaints, makeKnotPath } from './tune-lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const DIST = join(ROOT, 'apps', 'playground', 'dist')
const ASSETS = join(ROOT, 'assets')
const FRAMES = join(ASSETS, 'frames')

const argv = new Set(process.argv.slice(2))
const PROBE = argv.has('--probe')
const SWEEP_ONLY = argv.has('--sweep')
const LAUNCH_ONLY = argv.has('--launch')
const NO_ENCODE = argv.has('--no-encode')
/** Skip the browser entirely and re-encode whatever is already in assets/frames. */
const ENCODE_ONLY = argv.has('--encode')
/** The homepage cut, rather than the playground stage. */
const HOME = argv.has('--home')
/** The square feed cut: the panel is worked, not avoided. */
const TUNE = argv.has('--tune')

const W = 1280
const H = 720
const FPS = 60
const FRAME_MS = 1000 / FPS

/** The 15s spot, and the 3s loop cut for the README and for replies. */
const LAUNCH_SECONDS = 15
const SWEEP_SECONDS = 3

/** The homepage cut: no panel, no controls, the headline carrying the message. */
const HOME_SECONDS = 12
const HOME_SWEEP_SECONDS = 3

/** The `--tune` cut: the square feed master for the 0.2.0 announcement. */
const TUNE_SECONDS = 18
const TUNE_SIZE = 1080
/** Supersampled and downscaled at encode; see `encodeMp4`'s scale argument. */
const TUNE_SCALE = 2

/**
 * The seed `randomize()` rolls against.
 *
 * `config/actions.ts` samples seven numeric controls, then picks a charset and
 * a whole preset. On the real `Math.random` that is a different take every run
 * — and a roll into Terminal or Amber, which this video does not use.
 *
 * So the roll is pinned, and the seed is chosen the way a keyframe is: by
 * looking at what it produces. The run reports which preset this one lands on;
 * if it is ever not one of Void, Paper or Glass, the seed is wrong and the
 * render fails rather than shipping the wrong palette.
 *
 * This one lands on Paper with the hairline charset, and moves all seven
 * sliders a visible distance without pushing any of them somewhere the field
 * stops reading — speed to a standstill, brightness far enough down that a
 * light page goes blank. Staying on Paper is deliberate: it leaves the closing
 * reset holding the only return to dark.
 */
const TUNE_SEED = 0x85777

/** Presets the take is allowed to show. See the design doc's palette section. */
const NEUTRAL_PRESETS = ['Void', 'Paper', 'Glass']

/**
 * Frames of crossfade that close the loop over the field — see `dissolveLoop`.
 * Long enough that the field eases rather than switches; short enough to stay
 * under the beat where the cursor is moving slowest, so it is never the most
 * interesting thing on screen. The GIF gets less because it repeats four times
 * as often.
 */
const HOME_DISSOLVE = Math.round(0.6 * FPS)
const HOME_SWEEP_DISSOLVE = Math.round(0.3 * FPS)

/**
 * The square cut needs one too, and measurably: across the seam the field
 * lands 16dB PSNR from frame 0 where a neighbouring frame sits at 32dB, so
 * untreated it pops every time the feed repeats.
 *
 * A crossfade over a composited cursor would normally mean two arrows on
 * screen at once. It does not here, and the closed path is why: the tail
 * frames run at `duration + i/FPS`, `makeKnotPath` takes that modulo the
 * duration, so the arrow in a tail frame is at the same pixel as the head
 * frame it is blended into. Only the field differs, which is the whole point.
 * The panel is at baseline on both sides of the seam — reset put it there —
 * so it blends with itself and holds still.
 */
const TUNE_DISSOLVE = Math.round(0.6 * FPS)

/**
 * Frames run before the first captured one, with the cursor still off-canvas.
 *
 * The trail buffer starts at the background colour and a field that has only
 * existed for three frames is visibly thinner than one that has been drifting;
 * 1.2s is where the phosphor reaches steady state at the site's `trail: 0.3`.
 * Network happens before any of this, on real time — it is the only thing that
 * does, and nothing in the picture depends on how long it took.
 */
const AMBIENT_FRAMES = Math.round(1.2 * FPS)

/**
 * And then the path itself is run, unrecorded, for the final PRE_ROLL seconds
 * of the loop — the stretch that in a looping video immediately precedes frame
 * 0. So the cursor enters frame 0 already carrying the energy, the wake and
 * the smoothing lag it would have on the second time round. This is what makes
 * the brief's "cursor already in motion" true rather than approximated, and it
 * is the same reason the seam looks continuous.
 */
const PRE_ROLL = 1.5

// ── the pointer path ───────────────────────────────────────────────────────

/**
 * Where the cursor may go without disappearing.
 *
 * The page is full-bleed but not uniformly readable. The panel is a slab of
 * opaque paper down the right edge — 430px of it since c6a6523 widened it —
 * and `.stage-shell::before` lays a scrim over the top-left corner that runs
 * from 96% down to nothing, under which the core is dimmed to the point of
 * vanishing. So the sweep lives in the band between them, and `assertClear`
 * below fails the run if a keyframe drifts into either during editing rather
 * than letting it ship dark.
 *
 * The scrim is `min(760px, 68%) × 440px`, so this literal is the 1280-wide cut
 * specifically: at the square cut's 1080 the 68% binds instead and it measures
 * 734×440. That is why the square scene reads the rect off the live DOM rather
 * than sharing this constant. The numbers here were 680×380 for longer than
 * they were true, which made `assertClear` guard a smaller corner than the
 * page actually washes out.
 */
const SCRIM = { w: 760, h: 440 }

/** Resolved from the live DOM; the literal is only a fallback for the check. */
const TOGGLE = Symbol('interaction toggle')

/**
 * The 15 seconds, as timed keyframes.
 *
 * Speed is spacing: 294px in 0.25s is the flick at 5.20, 130px in 1.1s is the
 * drift at 3.90. Nothing here is eased by a curve parameter — the curve is
 * uniform and the *rhythm* is in the timing column, which is the only way to
 * read a choreography off a page and edit it.
 *
 * `hold` parks the cursor for a beat. It is used exactly where a hand would
 * stop, which is on a button it is about to press, and it is the one place the
 * path is deliberately not C1.
 */
const LAUNCH_PATH = [
  // 0:00–0:03 — already sweeping. The arc opens up-right, away from the scrim.
  { t: 0.0, x: 250, y: 520 },
  { t: 0.55, x: 430, y: 350 },
  { t: 1.2, x: 680, y: 290 },
  { t: 1.85, x: 845, y: 430 },
  { t: 2.45, x: 720, y: 595 },
  { t: 3.0, x: 500, y: 620 },

  // 0:03–0:06 — a long slow curve, so the flick that ends it has something to
  // be fast against. The wake is a length, and length only reads comparatively.
  { t: 3.9, x: 300, y: 545 },
  { t: 5.0, x: 250, y: 400 },
  { t: 5.2, x: 330, y: 300 },
  { t: 5.45, x: 620, y: 250 }, // flick: 294px in 0.25s
  { t: 5.7, x: 862, y: 380 },
  { t: 6.0, x: 800, y: 530 },

  // 0:06–0:09 — reach for the switch, press it, and go back to work.
  { t: 6.4, x: TOGGLE, y: TOGGLE, hold: 0.13, cue: 'toggle' },
  { t: 6.9, x: 770, y: 470 },
  { t: 7.45, x: 470, y: 560 },
  { t: 8.0, x: 250, y: 430 },
  { t: 8.6, x: 420, y: 300 },
  { t: 9.0, x: 660, y: 330 },

  // 0:09–0:11 — back on. The press itself sets energy to 1 (pointer.ts
  // `onDown`), so the field does not fade up, it snaps on under the cursor.
  { t: 9.4, x: TOGGLE, y: TOGGLE, hold: 0.13, cue: 'toggle' },
  { t: 9.9, x: 790, y: 430 },
  { t: 10.4, x: 600, y: 565 },
  { t: 11.0, x: 390, y: 600 },

  // 0:11–0:15 — the cursor does not change. Everything under it does.
  { t: 11.6, x: 215, y: 460, cue: 'waves' },
  { t: 12.3, x: 330, y: 300 },
  { t: 12.9, x: 600, y: 250 },
  { t: 13.35, x: 835, y: 330, cue: 'pulse' },
  { t: 13.9, x: 790, y: 545 },
  { t: 14.45, x: 560, y: 615 },
  // and wraps to t=0
]

/**
 * The 3s loop: one closed gesture, no controls touched.
 *
 * Deliberately not frames 0–180 of the spot above. That range does not return
 * to where it started, so cut as a GIF it would jump — and a GIF that jumps in
 * a README is worse than no GIF. This is its own closed figure with a flick in
 * it, so the one detail the loop has to sell still appears inside three
 * seconds.
 */
const SWEEP_PATH = [
  { t: 0.0, x: 300, y: 560 },
  { t: 0.45, x: 250, y: 390 },
  { t: 0.75, x: 400, y: 285 },
  { t: 0.95, x: 690, y: 258 }, // flick
  { t: 1.35, x: 860, y: 400 },
  { t: 1.85, x: 780, y: 570 },
  { t: 2.3, x: 560, y: 620 },
  { t: 2.65, x: 400, y: 620 },
]

// ── the homepage cut ───────────────────────────────────────────────────────

/**
 * The homepage is a different composition problem to `/flow`, in three ways.
 *
 * There is no panel, which is the point — a bright control surface down the
 * right fifth is the first thing the eye lands on in a feed, and it makes the
 * product read as a dev tool. What replaces it is the headline, which is worth
 * more: the video autoplays muted, so the page's own words are the only
 * narration it gets.
 *
 * But the hero copy is *centred* — measured, x 374–906 — where the OG card's
 * is left-aligned. So "keep the sweep clear of the text" does not leave a
 * generous right half here; it leaves the 290px ribbon between the copy and
 * the right edge. `HOME_CLEAR_X` is that boundary and `guardHome` enforces it
 * against the sampled curve rather than the keyframes, because a spline
 * overshoots between knots and the keyframes alone would not catch it.
 *
 * The ribbon turns out to be where the field wants the cursor anyway.
 * `.hero-scrim` is a radial that sits at 92% black over the centre and falls
 * to nothing at the edges, so the core only really reads outside the copy —
 * the composition and the constraint agree.
 */
const HOME_CLEAR_X = 920

/**
 * The bottom of the frame is the other soft edge. `.hero-field` is masked to
 * fade out over its last 104px so the hero ends by running out rather than
 * being cut, which means a core much below this is a core dimming for reasons
 * the viewer cannot see.
 */
const HOME_CLEAR_Y = 600

/**
 * And the top. `.site-head` is transparent and takes no pointer events, but
 * its links do — run the cursor through them and they brighten on hover,
 * which in a launch video looks like a UI demo nobody asked for.
 */
const HOME_CLEAR_TOP = 100

/**
 * Twelve seconds, three beats, closed.
 *
 * Same rule as above: speed is spacing. The sweep runs ~200px/s, the curve
 * into the flick drops to ~110, and the flick itself is 389px in 0.4s — call
 * it 970px/s, roughly nine times the curve that sets it up. That ratio is the
 * whole reason the wake is legible; a fast gesture in a film of fast gestures
 * reads as nothing in particular.
 */
const HOME_PATH = [
  // 0:00–0:04 — already sweeping, up into the brightest corner and back down.
  { t: 0.0, x: 1010, y: 330 },
  { t: 0.7, x: 1105, y: 235 },
  { t: 1.4, x: 1215, y: 175 },
  { t: 2.1, x: 1230, y: 300 },
  { t: 2.8, x: 1160, y: 410 },
  { t: 3.4, x: 1045, y: 455 },
  { t: 4.0, x: 965, y: 395 },

  // 0:04–0:08 — the slow curve exists to be the thing the flick is fast
  // against, so it is genuinely slow: three knots over 2.4s, ~100px/s. It
  // stops well short of the bottom fade because the curve sags below its own
  // knots on the way through — see guardHome, which is what caught that.
  { t: 4.9, x: 972, y: 470 },
  { t: 5.7, x: 1020, y: 535 },
  { t: 6.4, x: 1105, y: 552 },
  { t: 6.8, x: 1230, y: 190 }, // flick: 383px in 0.4s
  { t: 7.3, x: 1180, y: 140 },
  { t: 8.0, x: 1075, y: 130 },

  // 0:08–0:12 — drifts to the top, then turns down and comes back to the start
  // heading up-right, which is the direction frame 0 leaves in. The turn is
  // inside the beat rather than on the seam; put it on the seam and the loop
  // point becomes a visible flick of the wrist.
  { t: 8.9, x: 985, y: 170 },
  { t: 9.8, x: 958, y: 265 },
  { t: 10.7, x: 955, y: 375 },
  { t: 11.4, x: 975, y: 425 },
  // and wraps to t=0
]

/**
 * The strongest three seconds, as a closed loop.
 *
 * Not a literal cut from the twelve. The spot is a loop over 12s, so no 3s
 * window of it returns to where it began — lifted straight out, the cursor
 * teleports on every repeat, which in a README reads as a broken image rather
 * than a design choice. This is the same gesture — drift, settle, flick,
 * recover — rebuilt as its own closed figure, so what it loses in literalness
 * it gains in being watchable more than once.
 */
const HOME_SWEEP_PATH = [
  { t: 0.0, x: 1120, y: 195 },
  { t: 0.5, x: 1030, y: 285 },
  { t: 1.1, x: 985, y: 420 },
  { t: 1.7, x: 1040, y: 545 },
  { t: 2.1, x: 1130, y: 578 },
  { t: 2.42, x: 1232, y: 300 }, // flick: 296px in 0.32s
  { t: 2.75, x: 1205, y: 205 },
]

// ── the square cut ─────────────────────────────────────────────────────────

/**
 * Eighteen seconds, one shot, closed.
 *
 * Coordinates are for the 1080×1080 frame. The clear band is what is left once
 * the panel takes x 637–1067 and the title scrim takes the top-left 734×440 —
 * roughly x 40–610, y 470–1040, which is why every field knot below sits low
 * and left. `placementComplaints` fails the render if one drifts.
 *
 * The rhythm is in the timing column, as it is in the other three paths. What
 * is new is that four of these keyframes name a control instead of a place:
 * the panel is the subject of this cut rather than something to keep out of.
 *
 * The two tone targets are chosen against the shader, not by eye. `main.frag`
 * computes `v = clamp((v - 0.5) * contrast + 0.5 + brightness, 0, 1)`, and an
 * ambient field sits mostly below 0.5 — so contrast up pushes the mid tones
 * down and the peaks up, and the field *thins and sharpens*. Brightness then
 * lifts the whole curve and it fills back in, denser than it began. Two moves,
 * two directions, both legible at feed bitrate. Both targets also sit far
 * outside the ±8px detent well at their baselines, so each lands on its step.
 */
const TUNE_PATH = [
  // 0:00–0:02 — already sweeping, low and left, carrying its wake in.
  { t: 0.0, x: 200, y: 890 },
  { t: 0.75, x: 315, y: 745 },
  { t: 1.5, x: 470, y: 668 },

  // 0:02–0:05 — into the panel, take contrast, and pull it up.
  { t: 2.15, ctl: 'contrast', to: 2.4, over: 1.15 },

  // 0:05–0:07 — a short transit down to the next slider, then lift the whole
  // field back in with brightness.
  { t: 3.85, x: 830, y: 545, via: true },
  { t: 4.3, ctl: 'brightness', to: 0.22, over: 0.95 },

  // 0:07–0:11 — cross to the presets and press Paper. 320ms of travel in
  // `useTravel`, and the frame inverts.
  { t: 6.1, x: 820, y: 660, via: true },
  { t: 7.0, click: 'Paper', hold: 0.14 },

  // 0:11–0:14 — back into the field, which is now off-white. The core is
  // #1a1a1a on #f5f2ea: a dark wake on light, which is the whole release.
  { t: 8.3, x: 560, y: 640 },
  { t: 9.2, x: 330, y: 720 },
  { t: 10.1, x: 205, y: 880 },
  { t: 11.0, x: 350, y: 1005 },
  { t: 11.45, x: 585, y: 700 }, // flick: 380px in 0.45s
  { t: 12.2, x: 505, y: 540 },

  // 0:14–0:16 — randomize. Every slider travels at once, and the charset and
  // the palette move with them.
  { t: 13.1, x: 760, y: 200, via: true },
  { t: 14.0, click: 'Randomize', hold: 0.14 },

  // 0:16–0:18 — reset travels the whole config home, and the cursor drops back
  // into the field heading where frame 0 leaves.
  { t: 15.9, click: 'Reset', hold: 0.14 },
  { t: 16.7, x: 520, y: 560 },
  { t: 17.3, x: 330, y: 700 },
  // and wraps to t=0
]

/**
 * The bounding box the sampled curve actually visits.
 *
 * `placementComplaints` checks knots, and a spline between two legal knots can
 * still bow somewhere neither of them is. This does not fail the run — a bow
 * inside the frame is a choreography question, not an error — but it is
 * printed, so the answer is measured rather than eyeballed frame by frame.
 */
function curveExtremes(path, duration) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let f = 0; f < Math.round(duration * FPS); f++) {
    const p = path(f / FPS)
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  return { minX, maxX, minY, maxY }
}

/**
 * A closed, non-uniform Catmull-Rom through the keyframes.
 *
 * Closed is the requirement: the tangent at t=0 is computed from the last
 * keyframe and the first, so position *and* velocity match across the loop
 * point and the seam is invisible. Non-uniform is what lets the timing column
 * above carry the rhythm — the standard `(p₊ − p₋) / (t₊ − t₋)` tangent, which
 * degrades to uniform Catmull-Rom when the knots are evenly spaced.
 */
function makePath(keys, duration, toggle) {
  const at = (k) => ({
    t: k.t,
    x: k.x === TOGGLE ? toggle.x : k.x,
    y: k.y === TOGGLE ? toggle.y : k.y,
  })

  // A hold becomes two knots at one place; the span between them is frozen.
  const knots = []
  for (const k of keys) {
    const p = at(k)
    knots.push({ ...p, frozen: Boolean(k.hold) })
    if (k.hold) knots.push({ ...p, t: k.t + k.hold, frozen: false })
  }
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

    return { x: hermite('x'), y: hermite('y'), pressed: false }
  }
}

/**
 * The homepage check, run against the curve rather than the keyframes.
 *
 * Every knot can sit well clear of the copy and the spline still bulge into it
 * between two of them — non-uniform Catmull-Rom overshoots on the outside of a
 * turn, which is exactly the shape this path is made of. So this samples every
 * frame the capture will actually use and reports the worst excursion, and it
 * takes the copy box from the live DOM so a type change that widens the column
 * fails the render instead of quietly clipping the headline.
 */
function guardHome(path, duration, copy) {
  const left = Math.max(HOME_CLEAR_X, Math.round(copy.x + copy.width) + 14)
  const bounds = [
    { axis: 'x', dir: -1, limit: left, why: 'inside the copy column' },
    { axis: 'x', dir: 1, limit: W - 16, why: 'far enough right to clip the arrow' },
    { axis: 'y', dir: 1, limit: HOME_CLEAR_Y, why: "inside the field's bottom fade" },
    { axis: 'y', dir: -1, limit: HOME_CLEAR_TOP, why: 'up among the header links, which would light up under it' },
  ]
  const worst = bounds.map((b) => ({ ...b, at: -Infinity, t: 0 }))
  for (let f = 0; f < Math.round(duration * FPS); f++) {
    const t = f / FPS
    const p = path(t)
    for (const w of worst) {
      const v = p[w.axis] * w.dir
      if (v > w.at) { w.at = v; w.t = t }
    }
  }
  const bad = worst
    .filter((w) => w.at > w.limit * w.dir)
    .map((w) => `  the curve reaches ${w.axis}=${Math.round(w.at * w.dir)} at t=${w.t.toFixed(2)}s, ${w.why}`)
  return {
    bad,
    clearance: Math.round(-worst[0].at - left),
    lowest: Math.round(worst[2].at),
  }
}

/** Keyframes that would put the cursor somewhere it cannot be seen. */
function assertClear(keys, toggle, panel) {
  const bad = []
  for (const k of keys) {
    if (k.x === TOGGLE) continue
    const inPanel =
      k.x >= panel.x && k.x <= panel.x + panel.width &&
      k.y >= panel.y && k.y <= panel.y + panel.height
    // Where the scrim is still over 55% opaque: the top-left triangle of its box.
    const s = k.x / SCRIM.w + k.y / SCRIM.h
    if (inPanel) bad.push(`  t=${k.t}s (${k.x},${k.y}) is under the panel`)
    else if (s < 0.85) bad.push(`  t=${k.t}s (${k.x},${k.y}) is under the title scrim`)
  }
  return bad
}

// ── the clock ──────────────────────────────────────────────────────────────

/**
 * Installed before any of the page's own script, so nothing ever sees the
 * real clock. After this, the page advances only when `__tick` says so.
 */
function INSTALL_CLOCK() {
  let now = 0
  let pending = new Map()
  let nextId = 1

  window.requestAnimationFrame = (cb) => {
    const id = nextId++
    pending.set(id, cb)
    return id
  }
  window.cancelAnimationFrame = (id) => {
    pending.delete(id)
  }

  // Read by React's scheduler and by anything else measuring elapsed time.
  // Frozen between ticks, which makes `shouldYield` always false and React
  // finish its work in one task — more deterministic, not less.
  const origin = performance.timeOrigin
  performance.now = () => now
  Date.now = () => Math.round(origin + now)

  /**
   * CSS transitions and keyframes are Web Animations on a document timeline
   * that cannot be swapped out, so each is pinned by hand: remembered at the
   * tick it first appeared, then held at exactly the elapsed virtual time
   * since. Finished ones are released so the element settles onto its real
   * computed style instead of being held at a fill value forever.
   */
  const born = new WeakMap()
  function pinAnimations() {
    for (const a of document.getAnimations()) {
      if (!born.has(a)) {
        born.set(a, now)
        try {
          a.pause()
        } catch {
          /* already finished, or not pausable */
        }
      }
      const elapsed = now - born.get(a)
      try {
        const end = a.effect?.getComputedTiming?.().endTime ?? 0
        if (elapsed >= end) a.finish()
        else a.currentTime = elapsed
      } catch {
        /* a transition removed mid-tick */
      }
    }
  }

  window.__tick = (ms) => {
    now += ms
    // Swapped before draining, so a callback that re-registers itself — which
    // every animation loop does — lands in the next frame and not this one.
    const due = pending
    pending = new Map()
    for (const cb of due.values()) {
      try {
        cb(now)
      } catch (err) {
        console.error(err)
      }
    }
    pinAnimations()
    return due.size
  }

  window.__now = () => now
}

/**
 * Replaces `Math.random` with a seeded stream, before any page script runs.
 *
 * Built as source text rather than as a function reference because an init
 * script is serialised away from node's module scope — a plain closure over
 * `mulberry32` would arrive undefined. Stringifying the tested function is the
 * only way to keep one definition of the algorithm.
 */
const INSTALL_RANDOM = (seed) =>
  `(() => {
     const mulberry32 = ${mulberry32.toString()};
     const rand = mulberry32(${seed});
     Math.random = rand;
     window.__seeded = true;
   })()`

// ── the composited cursor ──────────────────────────────────────────────────

/**
 * Headless Chrome composites no cursor, so without this the video is a field
 * reacting to nothing. Same arrow as the OG card — tip at (0,0) of its own box
 * so a translate puts the point exactly on the pointer, white fill with a
 * hairline of the canvas colour so it survives landing on a lit cell, and a
 * drop shadow for the same reason.
 *
 * It is injected as a fixed-position overlay rather than composited into the
 * PNGs afterwards. Compositing 900 frames in `pngjs` costs a decode and a
 * re-encode each; letting the browser draw it costs nothing, keeps the
 * shadow's rendering identical to the card's, and means the screenshot bytes
 * go straight to disk.
 */
const CURSOR_SVG = `<svg width="26" height="40" viewBox="0 0 20.3 31.5" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,0 L0,28.8 L6.9,21.9 L11.1,31.5 L15.8,29.5 L11.6,20.2 L20.3,20.2 Z"
        fill="oklch(0.99 0 0)" stroke="oklch(0.108 0.005 71.346)" stroke-width="1.15"
        stroke-linejoin="round" />
</svg>`

const CURSOR_SETUP = (svg) => {
  const host = document.createElement('div')
  host.id = '__cursor'
  host.style.cssText = [
    'position:fixed', 'left:0', 'top:0', 'width:0', 'height:0',
    // Above the panel's z-index 6, and above anything a view transition adds.
    'z-index:2147483647',
    'pointer-events:none',
    'transform-origin:0 0',
    'will-change:transform',
    'filter:drop-shadow(0 2px 7px oklch(0 0 0 / 0.65))',
  ].join(';')
  host.innerHTML = svg
  document.body.appendChild(host)

  // Scaled about the tip, so a press dips the arrow without moving the point
  // it is indicating. Matches the panel's own `.toggle:active { scale: 0.96 }`
  // in spirit — the click has to be visible or the toggle appears to flip on
  // its own.
  window.__cursorAt = (x, y, pressed) => {
    host.style.transform = `translate3d(${x}px,${y}px,0) scale(${pressed ? 0.86 : 1})`
  }
}

// ── static server ──────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

function serve(root) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    let file = join(root, decodeURIComponent(url.pathname))
    // SPA fallback: /flow is a route, not a file.
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })
    })
  })
}

// ── core-finding, for --probe only ─────────────────────────────────────────

function luminance(r, g, b) {
  const f = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Centroid of the brightest region, as in og.mjs — here only to measure the
 *  gap between the arrow and the core it is dragging. */
function findCore(png, box) {
  let max = 0
  const each = (fn) => {
    for (let y = box.y; y < box.y + box.h; y++) {
      for (let x = box.x; x < box.x + box.w; x++) {
        const i = (png.width * y + x) << 2
        fn(x, y, luminance(png.data[i], png.data[i + 1], png.data[i + 2]))
      }
    }
  }
  each((_x, _y, l) => { max = Math.max(max, l) })
  const cut = max * 0.94
  let sx = 0
  let sy = 0
  let n = 0
  each((x, y, l) => { if (l >= cut) { sx += x; sy += y; n++ } })
  return n ? { x: Math.round(sx / n), y: Math.round(sy / n) } : null
}

// ── closing the loop over the field ────────────────────────────────────────

const TO_LINEAR = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function toSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(c * 255)))
}

/**
 * The closed spline loops the cursor. It does not loop the field.
 *
 * `flow.glsl` drives every term from sin/cos of t with coefficients 0.6, 0.5,
 * 0.4 and 0.3, so the field's period is 2π/0.1 ≈ 62.8s and no twelve-second
 * window of it is a loop. Measured on the first render, the seam moved 34% of
 * the pixels by more than a just-noticeable step where an ordinary frame moves
 * 0.5% — a slap every time the thing repeats, which on a muted autoplay is the
 * only edit the viewer is guaranteed to notice.
 *
 * Nothing can be tuned to fix that: matching the field's period would mean a
 * 63-second take or running the current 5.2× too fast. So the capture instead
 * runs `overlap` frames past the end — same cursor, since the path has already
 * wrapped, but the field a full take further on — and those frames are
 * dissolved back over the head. Frame 0 becomes exactly frame `total`, which is
 * the natural successor to frame `total-1`, and the field then eases across to
 * its own beginning over the following `overlap` frames.
 *
 * Only the ambient field crossfades. The cursor, its core and its wake are
 * pixel-identical in both layers, because the pointer sim is a stable filter
 * being fed the same periodic input — so nothing the eye is actually tracking
 * ghosts. The mix is in linear light: dissolving two dark fields in sRGB dips
 * the midpoint, which would read as the field dimming and coming back.
 *
 * The stage cut deliberately gets none of this. Its page state does not loop
 * either — it ends on `pulse` with the toggle back on, having started on
 * `flow` — so a dissolve there would crossfade two different effects, and that
 * video is a tour rather than a loop.
 */
function dissolveLoop(dir, total, overlap) {
  const name = (f) => join(dir, `f-${String(f).padStart(4, '0')}.png`)
  for (let i = 0; i < overlap; i++) {
    const head = PNG.sync.read(readFileSync(name(i)))
    const tail = PNG.sync.read(readFileSync(name(total + i)))
    // Linear, and deliberately not smoothstep. Easing exists to hide the
    // corners where a crossfade starts and stops, and it buys that by moving
    // half the change into the middle — which triples the worst single-frame
    // step. The two layers here are uncorrelated noise, so there is no edge for
    // a corner to show up on; what the eye can catch is one frame changing more
    // than its neighbours. Linear spreads the change evenly and puts the worst
    // step at total/overlap, which is what makes a short dissolve affordable.
    const w = i / (overlap - 1)
    for (let p = 0; p < head.data.length; p += 4) {
      for (let c = 0; c < 3; c++) {
        head.data[p + c] = toSrgb(
          TO_LINEAR[tail.data[p + c]] * (1 - w) + TO_LINEAR[head.data[p + c]] * w,
        )
      }
    }
    // Chromium screenshots are colourType 2 and pngjs defaults to 6. Writing a
    // handful of RGBA frames into an otherwise RGB sequence changes the format
    // mid-stream, and ffmpeg's image2 demuxer, which read the format from frame
    // 0, gives up with "Internal bug, should not have happened".
    writeFileSync(name(i), PNG.sync.write(head, { colorType: head.colorType }))
  }
  for (let i = 0; i < overlap; i++) rmSync(name(total + i), { force: true })
}

// ── capture ────────────────────────────────────────────────────────────────

async function capture({ origin, route, keys, duration, dir, label, frames: frameCount, measure, scene = 'stage', dissolve = 0, seeded = false }) {
  const total = frameCount ?? Math.round(duration * FPS)
  const home = scene === 'home'
  const tune = scene === 'tune'
  // `.hero` is `100svh` less the strip of tiles that has to clear the fold, so
  // at a 720-tall viewport it is 544 and the tiles are in shot. The frame is
  // produced by choosing a viewport that makes the hero exactly 1280×720 —
  // the height below is only the first guess, corrected from the measurement.
  const anchor = home ? '.hero-copy' : '.panel'

  const browser = await chromium.launch({
    // Same flags as the card: ANGLE on Metal is the only backend on this
    // machine that gives headless a WebGL2 context the renderer will accept.
    args: ['--use-gl=angle', '--use-angle=metal', '--hide-scrollbars', '--force-color-profile=srgb'],
  })
  const context = await browser.newContext({
    viewport: tune
      ? { width: TUNE_SIZE, height: TUNE_SIZE }
      : { width: W, height: home ? H + 284 : H },
    deviceScaleFactor: tune ? TUNE_SCALE : 1,
    reducedMotion: 'no-preference',
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.error(`  ✗ page error: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') console.error(`  ✗ console: ${m.text()}`) })

  await page.addInitScript(INSTALL_CLOCK)
  // After the clock, so the two init scripts run in a fixed order.
  if (seeded) await page.addInitScript({ content: INSTALL_RANDOM(TUNE_SEED) })

  /**
   * One frame. Everything the picture depends on is downstream of this call:
   * the rAF timestamp the field reads its clock from, the dt the pointer
   * smoothing integrates, and the CSS transitions on the toggle and the hint.
   * Returns how many callbacks were drained, which is the liveness check —
   * a frame in which the field did not schedule itself is a frozen field.
   */
  const advance = () => page.evaluate((ms) => window.__tick(ms), FRAME_MS)

  await page.goto(`${origin}${route}`, { waitUntil: 'load', timeout: 20_000 })
  await page.waitForFunction(
    (sel) => document.fonts.status === 'loaded' && Boolean(document.querySelector(sel)),
    anchor,
    { timeout: 20_000 },
  )

  const ready = await page.evaluate((sel) => ({
    fonts: document.fonts.status,
    gl: Boolean(document.querySelector('canvas')?.getContext?.('webgl2')),
    anchor: Boolean(document.querySelector(sel)),
    clock: typeof window.__tick === 'function',
    seeded: Boolean(window.__seeded),
  }), anchor)
  if (!ready.clock || !ready.gl || !ready.anchor) {
    throw new Error(`page did not settle: ${JSON.stringify(ready)}`)
  }
  if (seeded && !ready.seeded) {
    throw new Error('the seeded Math.random did not install; randomize would roll live')
  }

  const box = () => page.evaluate((sel) => {
    const b = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
    }
    const el = document.querySelector(sel)
    return {
      hero: document.querySelector('.hero') ? b(document.querySelector('.hero')) : null,
      copy: document.querySelector('.hero-copy') ? b(document.querySelector('.hero-copy')) : null,
      panel: document.querySelector('.panel') ? b(document.querySelector('.panel')) : null,
      toggle: document.querySelector('.panel .toggle') ? b(document.querySelector('.panel .toggle')) : null,
      anchor: el ? b(el) : null,
    }
  }, anchor)

  /**
   * Everything the choreography aims at, measured from the live DOM.
   *
   * Read once, after fonts have loaded and before the first captured frame.
   * The panel does not reflow during the take — nothing in it changes size
   * when a value changes — so a single read is honest, and re-reading each
   * frame would put a layout flush inside the frame loop.
   */
  const readAnchors = () => page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
    }

    const controls = {}
    for (const el of document.querySelectorAll('.panel .track-hit[role="slider"]')) {
      controls[el.getAttribute('aria-label')] = {
        ...rect(el),
        min: Number(el.getAttribute('aria-valuemin')),
        max: Number(el.getAttribute('aria-valuemax')),
        value: Number(el.getAttribute('aria-valuenow')),
      }
    }

    // Keyed on visible text, for both groups. The icons are `aria-hidden` and
    // carry no text node, so a button reads as its own label — which is also
    // what the choreography calls it, so the two cannot drift apart silently.
    const buttons = {}
    for (const sel of ['.panel .presets button', '.panel .panel-acts button']) {
      for (const el of document.querySelectorAll(sel)) buttons[el.textContent.trim()] = rect(el)
    }

    const shell = document.querySelector('.stage-shell')
    const before = getComputedStyle(shell, '::before')
    return {
      controls,
      buttons,
      panel: rect(document.querySelector('.panel')),
      // Measured rather than written down: the CSS is min(760px, 68%) × 440px,
      // so the constant that used to live here was wrong at every width.
      scrim: { w: Number.parseFloat(before.width), h: Number.parseFloat(before.height) },
      frame: { width: window.innerWidth, height: window.innerHeight },
    }
  })

  // Geometry is measured, never assumed — on the stage the toggle moves
  // whenever the panel above it changes; on the homepage the hero's height is
  // a function of the viewport, and the copy column's width is a function of
  // the type. Both are read back rather than written down.
  let geometry = await box()
  let clip = null
  let guard = null

  if (home) {
    // One correction is exact: the hero is (viewport − constant), so the
    // shortfall measured at the guess is the shortfall at any height.
    const shortfall = H - Math.round(geometry.hero.height)
    if (shortfall !== 0) {
      const v = page.viewportSize()
      await page.setViewportSize({ width: W, height: v.height + shortfall })
      geometry = await box()
    }
    const { hero } = geometry
    if (Math.round(hero.width) !== W || Math.round(hero.height) !== H || Math.round(hero.y) !== 0) {
      throw new Error(
        `.hero measured ${Math.round(hero.width)}×${Math.round(hero.height)} at y=${Math.round(hero.y)}; ` +
          `the frame needs it to be exactly ${W}×${H} at y=0`,
      )
    }
    // Everything below the hero — the tile grid, the footer — is out of shot
    // by construction rather than by cropping something wider.
    clip = { x: 0, y: 0, width: W, height: H }

    guard = guardHome(makePath(keys, duration, null), duration, geometry.copy)
    if (guard.bad.length) {
      throw new Error(`the path crosses the copy:\n${guard.bad.join('\n')}`)
    }
  }

  const toggle = geometry.toggle
    ? { x: Math.round(geometry.toggle.cx), y: Math.round(geometry.toggle.cy) }
    : null

  let anchors = null
  let expanded = null

  if (tune) {
    anchors = await readAnchors()
    expanded = expand(keys, anchors)
    const complaints = placementComplaints(expanded.knots, anchors)
    if (complaints.length) {
      throw new Error(`keyframes in dead zones:\n${complaints.join('\n')}`)
    }
  } else if (!home) {
    const complaints = assertClear(keys, toggle, geometry.panel)
    if (complaints.length) {
      throw new Error(`keyframes in dead zones:\n${complaints.join('\n')}`)
    }
  }

  await page.evaluate(CURSOR_SETUP, CURSOR_SVG)

  // Field only, no pointer: let the phosphor reach steady state.
  for (let i = 0; i < AMBIENT_FRAMES; i++) await advance()

  const path = tune ? makeKnotPath(expanded.knots, duration) : makePath(keys, duration, toggle)
  const cues = tune
    ? []
    : keys.filter((k) => k.cue).map((k) => ({ frame: Math.round(k.t * FPS), cue: k.cue }))
  // A press and a release at a button's centre is a real click, dispatched by
  // the browser — no `el.click()` shortcut, so the `:active` state, the focus
  // move and the ripple all happen the way a visitor's would.
  const buttonEvents = tune
    ? expanded.events.map((e) => ({ frame: Math.round(e.t * FPS), type: e.type, ctl: e.ctl, btn: e.btn }))
    : []
  /** What each drag reached, read at its own release rather than at the end —
   *  the take resets everything at 0:16, so the last frame knows nothing. */
  const landed = {}
  /** Which palette the seeded roll chose, read once the travel has settled. */
  let rolledPreset = null
  let readPresetAt = -1

  const setCursor = ([x, y, pressed]) => window.__cursorAt(x, y, pressed)

  // Unrecorded run of the loop's tail, so frame 0 inherits a moving cursor.
  const preRollFrames = Math.round(PRE_ROLL * FPS)
  for (let i = preRollFrames; i > 0; i--) {
    const p = path(duration - i / FPS)
    await page.mouse.move(p.x, p.y)
    await page.evaluate(setCursor, [p.x, p.y, false])
    await advance()
  }

  mkdirSync(dir, { recursive: true })
  const digests = []
  let drift = null
  let cadence = { min: Infinity, max: 0 }

  // `dissolve` extra frames are captured past the end and folded back into the
  // head below, so the field loops as cleanly as the cursor does.
  for (let f = 0; f < total + dissolve; f++) {
    const p = path(f / FPS)
    await page.mouse.move(p.x, p.y)

    for (const c of cues.filter((c) => c.frame === f)) {
      if (c.cue === 'toggle') await page.mouse.down()
      else {
        await page.evaluate((id) => {
          const b = [...document.querySelectorAll('.panel .seg button')]
            .find((el) => el.textContent.trim() === id)
          if (!b) throw new Error(`no effect button "${id}"`)
          b.click()
        }, c.cue)
      }
    }
    // The press is released a few frames later, at the end of its `hold`, so
    // the `:active` dip and the arrow's own dip are both on screen long enough
    // to be seen at 60fps.
    for (const c of cues.filter((c) => c.cue === 'toggle')) {
      const key = keys.find((k) => Math.round(k.t * FPS) === c.frame)
      if (f === c.frame + Math.round(key.hold * FPS)) await page.mouse.up()
    }
    // The tune scene's presses. `page.mouse.move` above has already put the
    // pointer on this frame's knot, so a down here lands where it is aimed.
    for (const e of buttonEvents.filter((e) => e.frame === f)) {
      if (e.type === 'down') {
        await page.mouse.down()
        continue
      }
      await page.mouse.up()
      if (e.ctl) {
        landed[e.ctl] = await page.evaluate(
          (label) => Number(document.querySelector(`.panel .track-hit[aria-label="${label}"]`)?.getAttribute('aria-valuenow')),
          e.ctl,
        )
      }
      // `useTravel` takes 320ms to carry the panel to a rolled config, so the
      // chip that ends up `aria-pressed` is only settled a little after the
      // click. Half a second is comfortably past it and still inside the beat.
      if (e.btn === 'Randomize') readPresetAt = f + Math.round(0.5 * FPS)
    }

    if (f === readPresetAt) {
      rolledPreset = await page.evaluate(() => {
        const on = document.querySelector('.panel .presets button[aria-pressed="true"]')
        return on ? on.textContent.trim() : null
      })
    }

    await page.evaluate(setCursor, [p.x, p.y, p.pressed])
    const drained = await advance()
    cadence = { min: Math.min(cadence.min, drained), max: Math.max(cadence.max, drained) }

    const buf = await page.screenshot(clip ? { type: 'png', clip } : { type: 'png' })
    writeFileSync(join(dir, `f-${String(f).padStart(4, '0')}.png`), buf)
    if (measure) digests.push(createHash('sha256').update(buf).digest('hex').slice(0, 12))

    // One mid-flick sample of how far the core is trailing the arrow — the
    // number the "arrow at the raw pointer" decision is defended by.
    // The square cut is left out on purpose. These boxes are device pixels
    // sized for a 1280×720 shot, and it films 1080² at 2×, so none of them
    // contains its cursor; worse, the brightest thing in a Void frame that
    // size is the panel, so `findCore` would answer confidently about the
    // wrong object. A second hard-coded box is how `SCRIM` came to be wrong
    // for two releases, and the lag it would be defending is already measured
    // by the two scenes below.
    if (measure && !tune && f === Math.min(total - 1, 24)) {
      const png = PNG.sync.read(buf)
      // Search where that scene's cursor actually is; on the homepage the
      // brightest thing in the stage's box would be the headline.
      const core = findCore(png, home
        ? { x: 900, y: 100, w: 380, h: 520 }
        : { x: 60, y: 150, w: 860, h: 520 })
      if (core) drift = { core, arrow: { x: Math.round(p.x), y: Math.round(p.y) } }
    }

    if (!measure && f % 120 === 0) {
      process.stdout.write(`  ${label} ${f}/${total + dissolve}\r`)
    }
  }

  // Which preset the seeded roll chose. Read after Reset has run, so it is the
  // *record* of the roll rather than the live state — `rolledPreset` is set in
  // the loop, at the frame randomize lands.
  const rolled = tune ? rolledPreset : null

  await browser.close()
  if (dissolve) dissolveLoop(dir, total, dissolve)
  return { digests, drift, cadence, toggle, geometry, total, guard, dissolve, anchors, landed: tune ? landed : null, rolled }
}

// ── encode ─────────────────────────────────────────────────────────────────

/**
 * Checked before the browser launches, not after.
 *
 * `ffmpeg-static` ships no binary of its own — it downloads one in a
 * postinstall script, and pnpm 10 does not run postinstall scripts unless the
 * package is named in `onlyBuiltDependencies`. So the module import succeeds,
 * the path it exports points at nothing, and the failure surfaces as a spawn
 * error after the frames have already been captured. Ninety seconds is too
 * long to wait to be told about a missing file.
 */
function requireFfmpeg() {
  if (ffmpeg && existsSync(ffmpeg)) {
    try {
      execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' })
      return
    } catch {
      /* present but not runnable */
    }
  }
  console.error(
    '\n✗ no usable ffmpeg binary.\n\n' +
      '  ffmpeg-static downloads one in a postinstall script, which pnpm skips\n' +
      '  unless the package is allowed to build. It is listed in\n' +
      '  pnpm-workspace.yaml, so this should just be:\n\n' +
      '      pnpm install\n\n' +
      '  Or capture the frames and encode them elsewhere:\n\n' +
      '      node scripts/video.mjs --no-encode\n',
  )
  process.exit(1)
}

function run(args) {
  return execFileSync(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] })
}

function encodeMp4(dir, out, scale = null) {
  run([
    '-y',
    '-framerate', String(FPS),
    '-i', join(dir, 'f-%04d.png'),
    // X will not play a track it cannot decode on every client; High profile,
    // 4:2:0 and an even frame size are the constraints that actually bite.
    // The silent AAC track is belt-and-braces: a video-only MP4 is legal and
    // usually fine, but a handful of clients treat it as a broken upload.
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest',
    // Supersampled capture, resolved here. Lanczos rather than bilinear
    // because the source is a grid of hard-edged glyphs: the sharper kernel is
    // the difference between characters and a halftone.
    ...(scale ? ['-vf', `scale=${scale}:${scale}:flags=lanczos`] : []),
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-level', '4.2',
    '-preset', 'slower',
    '-crf', '17',
    '-pix_fmt', 'yuv420p',
    '-x264-params', 'keyint=60:min-keyint=60:scenecut=0',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    out,
  ])
}

/**
 * GIF is a bad container for this and the numbers say so, so the settings below
 * are the measured floor rather than a guess.
 *
 * Every cell of the field redraws every frame, so inter-frame delta coding has
 * almost nothing to elide and size tracks (area × frame count) almost linearly.
 * Measured on the stage sweep: dropping 192 colours to 64 saved 3%, and turning
 * dither off saved another 1% — the entropy is spatial (where the glyphs are),
 * not chromatic. Cropping the panel out made the file *bigger*, because the
 * panel is the one large region that does hold still between frames.
 *
 * That leaves width and fps. Width is the one to keep: at 720 the glyphs blur
 * into a halftone and stop reading as characters, which is the whole point of
 * the library. So this matches hero.gif at 900 wide — a README shows them at
 * the same size — and buys that back at 20fps instead of 30.
 *
 * The colour count is 64 rather than the 96 that first shipped, and the reason
 * is worth writing down because it inverts the paragraph above. On the homepage
 * cut there is no panel, so nothing holds still, and the loop dissolve adds a
 * span of frames carrying two superimposed fields — which is where the
 * intermediate greys come from. Measured there, colour count is suddenly the
 * strongest lever in the encoder: 96→64 is −16% and 96→48 is −28%, against the
 * 3% it was worth on the stage. PSNR against the source is 49.8 / 48.1 / 46.4dB
 * for 96 / 64 / 48, and at 2× none of the three are distinguishable — a field
 * of quantised glyphs has no smooth ramp to band. 64 is the point where the
 * dissolve becomes free: the GIF lands at the same size it was before the loop
 * was fixed. 48 would be smaller still, and is more quality than the
 * measurement justifies spending.
 */
function encodeGif(dir, out, width = 900, fps = 20, colors = 64) {
  const palette = join(dir, '..', 'sweep-palette.png')
  const filters = `fps=${fps},scale=${width}:-1:flags=lanczos`
  run([
    '-y', '-framerate', String(FPS), '-i', join(dir, 'f-%04d.png'),
    // stats_mode=diff weights the palette toward what changes between frames,
    // which on a field of grey glyphs is the cursor core — the thing that must
    // not band.
    '-vf', `${filters},palettegen=max_colors=${colors}:stats_mode=diff`,
    palette,
  ])
  run([
    '-y', '-framerate', String(FPS), '-i', join(dir, 'f-%04d.png'), '-i', palette,
    // No dither: the source is already a halftone of discrete glyphs, so bayer
    // only stipples noise into the flat black and costs bytes for it.
    '-lavfi', `${filters}[x];[x][1:v]paletteuse=dither=none:diff_mode=rectangle`,
    '-loop', '0',
    out,
  ])
  rmSync(palette, { force: true })
}

const kb = (p) => `${(statSync(p).size / 1024).toFixed(0)}KB`
const mb = (p) => `${(statSync(p).size / 1024 / 1024).toFixed(2)}MB`

/**
 * Two cold loads, same numbers.
 *
 * `--probe` captures forty frames, which is the first two thirds of a second —
 * it never reaches the randomize beat at 0:14, so it cannot see this. Checking
 * the stream directly is cheap and lands on the actual claim: that two renders
 * of this take roll identically.
 */
async function probeSeed(origin) {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal', '--hide-scrollbars', '--force-color-profile=srgb'],
  })
  const runs = []
  for (const pass of [1, 2]) {
    const context = await browser.newContext({ viewport: { width: TUNE_SIZE, height: TUNE_SIZE }, colorScheme: 'dark' })
    const page = await context.newPage()
    await page.addInitScript(INSTALL_CLOCK)
    await page.addInitScript({ content: INSTALL_RANDOM(TUNE_SEED) })
    await page.goto(`${origin}/flow`, { waitUntil: 'load', timeout: 20_000 })
    runs.push(await page.evaluate(() => Array.from({ length: 8 }, () => Math.random())))
    await context.close()
  }
  await browser.close()
  const [a, b] = runs
  return { identical: a.every((v, i) => v === b[i]), sample: a.slice(0, 3) }
}

// ── run ────────────────────────────────────────────────────────────────────

if (!NO_ENCODE) requireFfmpeg()

if (!ENCODE_ONLY && !existsSync(join(DIST, 'index.html'))) {
  console.error('\n✗ apps/playground/dist is missing. Run `pnpm build` first.\n')
  process.exit(1)
}

const { server, origin } = ENCODE_ONLY
  ? { server: { close() {} }, origin: null }
  : await serve(DIST)
if (origin) console.log(`\n▸ serving apps/playground/dist\n  ${origin}`)

try {
  if (PROBE) {
    // Which cut the probe is probing. Determinism is a property of the scene,
    // not of the script, so each of the three has to be able to prove it for
    // itself — the square cut most of all, since it is the one whose page
    // state the choreography reaches in and changes.
    const scene = TUNE ? 'tune' : HOME ? 'home' : 'stage'
    console.log(`\n▸ probe — 40 frames, twice, on ${HOME ? '/' : '/flow'} (${scene})`)
    const runs = []
    for (const pass of [1, 2]) {
      const r = await capture({
        origin,
        route: HOME ? '/' : '/flow',
        keys: TUNE ? TUNE_PATH : HOME ? HOME_PATH : LAUNCH_PATH,
        duration: TUNE ? TUNE_SECONDS : HOME ? HOME_SECONDS : LAUNCH_SECONDS,
        scene,
        dir: join(FRAMES, `probe-${pass}`), label: `probe ${pass}`,
        frames: 40, measure: true, seeded: TUNE,
      })
      runs.push(r)
      console.log(`  pass ${pass}: ${r.digests.length} frames, ${r.cadence.min}–${r.cadence.max} rAF callbacks per tick`)
    }

    const [a, b] = runs
    const identical = a.digests.every((d, i) => d === b.digests[i])
    const unique = new Set(a.digests).size
    console.log('')
    if (a.anchors) {
      // The square cut aims at controls rather than coordinates, so what is
      // worth printing is what it resolved them to — and the scrim, which is
      // `min(760px, 68%)` wide and therefore only knowable at a real viewport.
      const { panel, scrim, controls } = a.anchors
      console.log(`  panel occupies x ${Math.round(panel.x)}–${Math.round(panel.x + panel.width)}, ` +
        `scrim ${Math.round(scrim.w)}×${Math.round(scrim.h)}`)
      console.log(`  resolved ${Object.keys(controls).length} controls: ${Object.keys(controls).join(', ')}`)
      console.log('  ✓ every keyframe is on the control it names')
    } else if (a.toggle) {
      console.log(`  toggle measured at ${a.toggle.x},${a.toggle.y}`)
      console.log(`  panel occupies x ${Math.round(a.geometry.panel.x)}–${Math.round(a.geometry.panel.x + a.geometry.panel.width)}`)
    } else {
      const c = a.geometry.copy
      console.log(`  hero ${Math.round(a.geometry.hero.width)}×${Math.round(a.geometry.hero.height)}`)
      console.log(`  copy column x ${Math.round(c.x)}–${Math.round(c.x + c.width)}, path clears it by ${a.guard.clearance}px`)
    }
    if (a.drift) {
      const d = Math.round(Math.hypot(a.drift.core.x - a.drift.arrow.x, a.drift.core.y - a.drift.arrow.y))
      console.log(`  arrow at ${a.drift.arrow.x},${a.drift.arrow.y}; core trailing at ${a.drift.core.x},${a.drift.core.y} — ${d}px behind`)
    }
    // One tick, one draw. The count is the field's own loop re-arming itself
    // (plus React's, on the frames it renders); zero would mean a dead field
    // photographed 40 times.
    const live = a.cadence.min >= 1
    console.log(`  ${unique}/40 frames distinct (the field is moving)`)
    console.log(`  ${live ? '✓' : '✗'} every tick drained at least one rAF callback`)
    console.log(`  ${identical ? '✓' : '✗'} both passes byte-identical`)
    if (!identical || !live) {
      console.error('\n✗ not deterministic — do not iterate on choreography against this.\n')
      process.exit(1)
    }
    console.log('')
  } else if (TUNE) {
    mkdirSync(ASSETS, { recursive: true })
    const dir = join(FRAMES, 'tune')

    if (!ENCODE_ONLY) {
      console.log(`\n▸ tune — ${TUNE_SECONDS}s, ${TUNE_SECONDS * FPS} frames, ${TUNE_SIZE}×${TUNE_SIZE} at ${TUNE_SCALE}×`)
      const seed = await probeSeed(origin)
      console.log(`  seeded Math.random: ${seed.identical ? '✓' : '✗'} reproducible across cold loads`)
      if (!seed.identical) {
        console.error('\n✗ the roll is not reproducible — the take would differ every render.\n')
        process.exit(1)
      }

      rmSync(dir, { recursive: true, force: true })
      const r = await capture({
        origin, route: '/flow', keys: TUNE_PATH, duration: TUNE_SECONDS,
        scene: 'tune', dir, label: 'tune', seeded: true, dissolve: TUNE_DISSOLVE,
      })

      const ex = curveExtremes(makeKnotPath(expand(TUNE_PATH, r.anchors).knots, TUNE_SECONDS), TUNE_SECONDS)
      console.log(`  ${r.total} frames  ·  ${r.cadence.min}–${r.cadence.max} rAF per tick    `)
      console.log(`  panel x ${Math.round(r.anchors.panel.x)}–${Math.round(r.anchors.panel.x + r.anchors.panel.width)}, ` +
        `scrim ${Math.round(r.anchors.scrim.w)}×${Math.round(r.anchors.scrim.h)}`)
      console.log(`  curve spans x ${Math.round(ex.minX)}–${Math.round(ex.maxX)}, y ${Math.round(ex.minY)}–${Math.round(ex.maxY)}`)
      console.log(`  sliders landed at contrast ${r.landed.contrast}, brightness ${r.landed.brightness}`)
      console.log(`  randomize rolled ${r.rolled ?? 'a palette matching no preset'}`)
      console.log(`  field looped with a ${(r.dissolve / FPS).toFixed(1)}s dissolve into frame 0`)

      // The drags are aimed at values, so a miss means the track moved or the
      // detent grew — either way the choreography is no longer describing what
      // the viewer sees.
      const missed = [
        ['contrast', 2.4, 0.05],
        ['brightness', 0.22, 0.01],
      ].filter(([key, want, step]) => Math.abs(r.landed[key] - want) > step)
      if (missed.length) {
        console.error(`\n✗ a drag did not land: ${missed.map(([k, w]) => `${k} wanted ${w}, got ${r.landed[k]}`).join('; ')}\n`)
        process.exit(1)
      }
      if (r.rolled !== null && !NEUTRAL_PRESETS.includes(r.rolled)) {
        console.error(`\n✗ the seed rolls ${r.rolled}, which is outside the neutral palette. Pick another TUNE_SEED.\n`)
        process.exit(1)
      }
    }

    if (!NO_ENCODE) {
      const out = join(ASSETS, 'tune.mp4')
      encodeMp4(dir, out, TUNE_SIZE)
      console.log(`\n▸ assets/tune.mp4\n  ${TUNE_SIZE}×${TUNE_SIZE} · ${FPS}fps · H.264 high · ${mb(out)}`)
    }
    console.log('')
  } else if (HOME) {
    mkdirSync(ASSETS, { recursive: true })

    if (!SWEEP_ONLY) {
      const dir = join(FRAMES, 'home')
      if (!ENCODE_ONLY) {
        console.log(`\n▸ home — ${HOME_SECONDS}s, ${HOME_SECONDS * FPS} frames`)
        rmSync(dir, { recursive: true, force: true })
        const r = await capture({
          origin, route: '/', keys: HOME_PATH, duration: HOME_SECONDS,
          scene: 'home', dir, label: 'home', dissolve: HOME_DISSOLVE,
        })
        const copy = r.geometry.copy
        console.log(`  ${r.total} frames  ·  ${r.cadence.min}–${r.cadence.max} rAF per tick    `)
        console.log(`  hero ${Math.round(r.geometry.hero.width)}×${Math.round(r.geometry.hero.height)}, ` +
          `copy column x ${Math.round(copy.x)}–${Math.round(copy.x + copy.width)}`)
        console.log(`  path clears it by ${r.guard.clearance}px; lowest point y=${r.guard.lowest}`)
        console.log(`  field looped with a ${(r.dissolve / FPS).toFixed(1)}s dissolve into frame 0`)
      }
      if (!NO_ENCODE) {
        const out = join(ASSETS, 'launch-home.mp4')
        encodeMp4(dir, out)
        console.log(`\n▸ assets/launch-home.mp4\n  ${W}×${H} · ${FPS}fps · H.264 high · ${mb(out)}`)
      }
    }

    if (!LAUNCH_ONLY) {
      const dir = join(FRAMES, 'home-sweep')
      if (!ENCODE_ONLY) {
        console.log(`\n▸ home sweep — ${HOME_SWEEP_SECONDS}s, ${HOME_SWEEP_SECONDS * FPS} frames`)
        rmSync(dir, { recursive: true, force: true })
        const r = await capture({
          origin, route: '/', keys: HOME_SWEEP_PATH, duration: HOME_SWEEP_SECONDS,
          scene: 'home', dir, label: 'home-sweep', dissolve: HOME_SWEEP_DISSOLVE,
        })
        console.log(`  ${r.total} frames  ·  path clears the copy by ${r.guard.clearance}px    `)
        console.log(`  field looped with a ${(r.dissolve / FPS).toFixed(1)}s dissolve into frame 0`)
      }
      if (!NO_ENCODE) {
        const gif = join(ASSETS, 'sweep-home.gif')
        encodeGif(dir, gif)
        console.log(`\n▸ assets/sweep-home.gif\n  900×506 · 20fps · ${mb(gif)}`)
      }
    }
    console.log('')
  } else {
    mkdirSync(ASSETS, { recursive: true })

    if (!SWEEP_ONLY) {
      const dir = join(FRAMES, 'launch')
      if (!ENCODE_ONLY) {
        console.log(`\n▸ launch — ${LAUNCH_SECONDS}s, ${LAUNCH_SECONDS * FPS} frames`)
        rmSync(dir, { recursive: true, force: true })
        const r = await capture({
          origin, route: '/flow', keys: LAUNCH_PATH, duration: LAUNCH_SECONDS,
          dir, label: 'launch',
        })
        console.log(`  ${r.total} frames  ·  ${r.cadence.min}–${r.cadence.max} rAF per tick    `)
      }
      if (!NO_ENCODE) {
        const out = join(ASSETS, 'launch.mp4')
        encodeMp4(dir, out)
        console.log(`\n▸ assets/launch.mp4\n  ${W}×${H} · ${FPS}fps · H.264 high · ${mb(out)}`)
      }
    }

    if (!LAUNCH_ONLY) {
      const dir = join(FRAMES, 'sweep')
      if (!ENCODE_ONLY) {
        console.log(`\n▸ sweep — ${SWEEP_SECONDS}s, ${SWEEP_SECONDS * FPS} frames`)
        rmSync(dir, { recursive: true, force: true })
        const r = await capture({
          origin, route: '/flow', keys: SWEEP_PATH, duration: SWEEP_SECONDS,
          dir, label: 'sweep',
        })
        console.log(`  ${r.total} frames                                  `)
      }
      if (!NO_ENCODE) {
        const gif = join(ASSETS, 'sweep.gif')
        encodeGif(dir, gif)
        console.log(`\n▸ assets/sweep.gif\n  900×506 · 20fps · ${mb(gif)}`)
      }
    }
    console.log('')
  }
} finally {
  server.close()
}
