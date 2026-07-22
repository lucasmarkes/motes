#!/usr/bin/env node
/**
 * Render the share card, and the raster favicons, from the library itself.
 *
 * The card is a real motes render — the same `createMotes` that ships in the
 * tarball, driven by a real cursor — because the thing being advertised is
 * that the cursor is an input, and a still drawn in a design tool would be a
 * claim rather than a demonstration.
 *
 * Run with the playground's dev server up:
 *
 *   pnpm -C apps/playground dev   # in one shell
 *   pnpm og                       # in another
 *
 * ── Why this serves its own page instead of screenshotting /flow
 *
 * hero.gif was captured off the live route. This cannot be: that route runs at
 * `density: 13`, which at 1200×630 is a 154×48 grid. Downscaled to the ~300px
 * X renders in feed, those glyphs average into flat grey and take the bright
 * core — the entire subject of the image — with them. The card needs cells
 * about twice that size, and density is not reachable from outside the page.
 *
 * So the script fulfils its own URL on the dev server's origin. That keeps
 * `/fonts/archivo-latin-var.woff2` resolvable, and lets the field be imported
 * straight from `packages/core/dist` — the built bundle, not the dev module
 * graph. The playground's own source is untouched by any of this.
 *
 * ── Why the field is stopped before the shutter
 *
 * Pointer energy decays whether or not the cursor is over the canvas: idle at
 * 0.92 per 60Hz frame, and even while active the term is `energy * 0.9 +
 * speed * 0.03`, so a cursor that stops moving is a cursor whose core is gone
 * inside ~100ms (renderer/pointer.ts). Parking the mouse and then taking a
 * screenshot — tens of milliseconds of compositing — reliably photographs the
 * afterglow. Instead the pointer is driven to the hot spot and the loop is
 * stopped one frame later, freezing the trail buffer at full energy. Every
 * pass below then photographs the identical frame.
 *
 * ── Why three passes
 *
 * Each answers a question the previous one cannot:
 *
 *   1. field alone      where is the core, really?
 *   2. field + scrim    is the text going to be legible on it?
 *   3. everything       the card
 *
 * Pass 1 matters most. The rendered core sits at the pointer's *smoothed*
 * position, which lags the mouse by a few frames at lerp 0.25 — so drawing
 * the arrow at the coordinate we asked for would put the cursor next to its
 * own effect. The arrow is placed at the core the field actually produced,
 * measured, rather than at the one we intended.
 */
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const PUBLIC = join(ROOT, 'apps', 'playground', 'public')
const CORE_BUNDLE = join(ROOT, 'packages', 'core', 'dist', 'index.js')

/**
 * Find the playground, rather than assume where it is.
 *
 * Vite's configured port is a preference, not a reservation: with 5173 taken
 * it silently starts on 5174, and the first version of this script cheerfully
 * rendered a card against whatever else was listening there. So the port is
 * probed, and each candidate has to prove it is this app by serving back
 * exactly the favicon in apps/playground/public — a fingerprint no other dev
 * server on the machine will match.
 */
const FINGERPRINT = '#050403'

async function findOrigin() {
  const explicit = process.env.MOTES_DEV_ORIGIN?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  for (let port = 5173; port <= 5180; port++) {
    const origin = `http://localhost:${port}`
    try {
      const res = await fetch(`${origin}/favicon.svg`, {
        signal: AbortSignal.timeout(1200),
      })
      if (res.ok && (await res.text()).includes(FINGERPRINT)) return origin
    } catch {
      /* nothing listening, or not us */
    }
  }
  return null
}

const ORIGIN = await findOrigin()
if (!ORIGIN) {
  console.error(
    '\n✗ no motes playground found on ports 5173–5180. Start it with:\n\n' +
      '    pnpm -C apps/playground dev\n\n' +
      '  or point this at it: MOTES_DEV_ORIGIN=http://localhost:1234 pnpm og\n',
  )
  process.exit(1)
}
const CARD_URL = `${ORIGIN}/__og`

const W = 1200
const H = 630
/** Some clients crop; nothing that must be read lives outside this inset. */
const INSET = 80

/**
 * Field settings for a still, not for a page.
 *
 * `density` is roughly double the site's so the grid survives a 4× downscale.
 * `trail` is well above the site's 0.3–0.35 because persistence is what draws
 * the wake, and a still has only one frame in which to show that the cursor
 * came from somewhere. `force` and `radius` are up for the same reason the
 * headline is: this is read at thumbnail size.
 */
const FIELD = {
  effect: 'flow',
  pointer: true,
  density: 22,
  trail: 0.72,
  radius: 155,
  force: 2.2,
  speed: 1.0,
  // DEFAULT_ACCENT from the playground's accents.ts — the cool near-white the
  // site already uses, so the card and the page share their one colour.
  accent: '#ddeafe',
}

/**
 * Where the cursor ends up, and where it came from — both in the right half.
 *
 * The first version swept up from the lower left, on the theory that a wake
 * crossing the card would tie the copy and the cursor together. It tied them
 * together by lighting the field directly behind the headline, which took a
 * scrim heavy enough to leave a visible vertical seam down the middle: the
 * card stopped reading as one field with a lit region and started reading as
 * two halves.
 *
 * Confining the path to the right means the copy column keeps the field at
 * its own ambient level — dark enough to write on without help — and the
 * scrim only has to do the little it was ever meant to do.
 */
const HOT = { x: 852, y: 208 }
const FROM = { x: 1140, y: 545 }

const CANVAS = 'oklch(0.108 0.005 71.346)'

const CARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  /* font-display: block, not the site's optional. A page may render in the
     fallback rather than shift; a card that is generated once may not. */
  @font-face {
    font-family: 'Archivo';
    src: url('/fonts/archivo-latin-var.woff2') format('woff2-variations');
    font-weight: 100 900;
    font-stretch: 62% 125%;
    font-style: normal;
    font-display: block;
  }

  :root {
    --canvas: ${CANVAS};
    --text: oklch(0.935 0.006 258);
    --text-2: oklch(0.735 0.011 258);
    --text-3: oklch(0.615 0.014 258);
    --mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: ${W}px;
    height: ${H}px;
    overflow: hidden;
    background: var(--canvas);
    -webkit-font-smoothing: antialiased;
  }

  #field { position: absolute; inset: 0; display: block; width: ${W}px; height: ${H}px; }

  /* Two layers, because the copy occupies a column and not a spot.
     The site's hero can use one centred ellipse; here the mark sits at the
     top of the safe area and the headline at the bottom of it, 400px apart,
     and a single ellipse that covers both would have to be large enough to
     reach the cursor and dim the one part of the field worth showing. So:
     a linear wash down the left column, run out by 72% so the right half is
     untouched, plus an ellipse deepening the corner the headline actually
     stands on. */
  #scrim {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        ellipse 64% 58% at 14% 76%,
        oklch(0.108 0.005 71.346 / 0.90) 0%,
        oklch(0.108 0.005 71.346 / 0.62) 46%,
        oklch(0.108 0.005 71.346 / 0) 100%
      ),
      linear-gradient(
        90deg,
        oklch(0.108 0.005 71.346 / 0.66) 0%,
        oklch(0.108 0.005 71.346 / 0.54) 32%,
        oklch(0.108 0.005 71.346 / 0.31) 56%,
        oklch(0.108 0.005 71.346 / 0.08) 70%,
        oklch(0.108 0.005 71.346 / 0) 84%
      );
  }

  #copy { position: absolute; inset: 0; }
  .hidden { display: none !important; }

  /* The alpha-mask pass: copy alone on nothing, so a transparent screenshot
     records exactly which pixels are ink. */
  .mask-only, .mask-only body { background: transparent !important; }
  .mask-only #field,
  .mask-only #scrim,
  .mask-only #arrow { display: none !important; }

  @supports (text-box: trim-both cap alphabetic) {
    #mark, h1, #sig { text-box: trim-both cap alphabetic; }
  }

  #mark {
    position: absolute;
    left: ${INSET}px;
    top: ${INSET}px;
    font-family: 'Archivo';
    font-stretch: 118%;
    font-weight: 600;
    font-size: 30px;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  /* One stack on the bottom-left corner of the safe area, so the headline
     and its line are set from the same edge the mark is. */
  #stack {
    position: absolute;
    left: ${INSET}px;
    bottom: ${INSET}px;
    right: ${INSET}px;
  }

  h1 {
    font-family: 'Archivo';
    font-stretch: 118%;
    font-weight: 600;
    font-size: 118px;
    line-height: 1.02;
    letter-spacing: -0.04em;
    color: var(--text);
    margin-bottom: 40px;
    white-space: pre-line;
  }

  /* The site's signature, and the only monospace on the card — which is what
     separates it from the display face without a rule or a box. */
  #sig {
    font-family: var(--mono);
    font-size: 34px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--text-2);
  }
  #sig .dim { color: var(--text-3); }
  /* The site's .sig-hot, with the box pulled in. At 20px on the page the
     padding reads as a lit cell; at 34px the same em value reads as a form
     field, and the glow is doing most of the work anyway. */
  #sig .hot {
    color: var(--text);
    padding: 0.05em 0.16em;
    margin: 0 0.02em;
    background: oklch(0.935 0.006 258 / 0.07);
    text-shadow: 0 0 24px oklch(0.935 0.006 258 / 0.6);
  }

  /* Positioned from the measured core in pass 1, tip at (0,0) of its own box.
     This one element is what makes a still read as interactive at thumbnail
     size, so it carries a shadow: it has to survive landing on lit field. */
  #arrow {
    position: absolute;
    filter: drop-shadow(0 2px 7px oklch(0 0 0 / 0.65));
  }
</style>
</head>
<body>
  <canvas id="field"></canvas>
  <div id="scrim"></div>

  <div id="copy">
    <div id="mark">motes</div>
    <div id="stack">
      <h1 id="headline">The cursor\nis an input.</h1>
      <div id="sig"><span>render(</span><span class="dim">time</span><span>,&nbsp;</span><span class="hot">pointer</span><span>)</span></div>
    </div>
  </div>

  <svg id="arrow" class="hidden" width="34" height="52" viewBox="0 0 20.3 31.5"
       fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0 L0,28.8 L6.9,21.9 L11.1,31.5 L15.8,29.5 L11.6,20.2 L20.3,20.2 Z"
          fill="oklch(0.99 0 0)" stroke="${CANVAS}" stroke-width="1.15"
          stroke-linejoin="round" />
  </svg>

  <script type="module">
    const { createMotes } = await import('/@fs${CORE_BUNDLE}')
    const field = createMotes(document.getElementById('field'), ${JSON.stringify(FIELD)})
    field.start()
    window.__motes = field
    await document.fonts.load("600 118px Archivo")
    await document.fonts.ready
    window.__ready = true
  </script>
</body>
</html>`

// ── helpers ────────────────────────────────────────────────────────────────

function shot(page) {
  return page.screenshot({ type: 'png' }).then((buf) => PNG.sync.read(buf))
}

/** sRGB relative luminance, for the contrast ratios below. */
function luminance(r, g, b) {
  const f = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function pixel(png, x, y) {
  const i = (png.width * y + x) << 2
  return [png.data[i], png.data[i + 1], png.data[i + 2]]
}

/**
 * Centroid of the brightest region — the pointer core.
 *
 * Safe because the field is monochrome and the renderer's own ramp caps
 * ambient cells around half intensity; only the pointer's boost carries a
 * cell to the accent (see the playground's accent.ts). So the top of the
 * histogram is the cursor and nothing else.
 */
function findCore(png) {
  let max = 0
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b] = pixel(png, x, y)
      max = Math.max(max, luminance(r, g, b))
    }
  }
  // Tight. At 0.82 the cut swept in the wake as well as the core, and the
  // centroid of core-plus-tail is not where the cursor is.
  const cut = max * 0.94
  let sx = 0
  let sy = 0
  let n = 0
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b] = pixel(png, x, y)
      if (luminance(r, g, b) >= cut) {
        sx += x
        sy += y
        n++
      }
    }
  }
  return { x: Math.round(sx / n), y: Math.round(sy / n), max, samples: n }
}

/**
 * Worst-case contrast of the copy against the field behind it, over the
 * pixels that are actually ink.
 *
 * Measuring a line box instead was both too strict and misleading: the box
 * runs to the end of the advance width and up through the leading, so the
 * first failure this reported — 3.07:1 at 733,271 — was the empty corner
 * above and right of the final `r` in "The cursor", where no ink is. `mask`
 * is a transparent-background screenshot of the copy alone, so its alpha
 * channel answers the only question that matters: is there a glyph here.
 *
 * Returns null when a box contains no ink, rather than the identity of
 * Math.min — Infinity printed beside a ✓ is how this check passed the first
 * time it ran, having measured nothing at all.
 */
const INK = 160

function worstContrast(bg, mask, rect, fg) {
  const lf = luminance(...fg)
  let worst = Infinity
  let at = null
  let inked = 0
  const x1 = Math.min(bg.width, Math.ceil(rect.x + rect.width))
  const y1 = Math.min(bg.height, Math.ceil(rect.y + rect.height))
  for (let y = Math.max(0, Math.floor(rect.y)); y < y1; y++) {
    for (let x = Math.max(0, Math.floor(rect.x)); x < x1; x++) {
      if (mask.data[((mask.width * y + x) << 2) + 3] < INK) continue
      const lb = luminance(...pixel(bg, x, y))
      const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05)
      if (ratio < worst) {
        worst = ratio
        at = { x, y }
      }
      inked++
    }
  }
  return inked === 0 ? null : { ratio: worst, at, inked }
}

/** Box-filter downscale. The resampler a feed uses is not this one, but the
 *  averaging is, and averaging is what destroys fine strokes. */
function downscale(png, targetW) {
  const scale = png.width / targetW
  const w = targetW
  const h = Math.round(png.height / scale)
  const out = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * scale)
    const y1 = Math.min(png.height, Math.ceil((y + 1) * scale))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * scale)
      const x1 = Math.min(png.width, Math.ceil((x + 1) * scale))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (png.width * sy + sx) << 2
          r += png.data[i]
          g += png.data[i + 1]
          b += png.data[i + 2]
          a += png.data[i + 3]
          n++
        }
      }
      const o = (w * y + x) << 2
      out.data[o] = r / n
      out.data[o + 1] = g / n
      out.data[o + 2] = b / n
      out.data[o + 3] = a / n
    }
  }
  return out
}

/**
 * Is the headline still readable once a feed has shrunk the card?
 *
 * Both the card and the ink mask are reduced to the same size, then the mask
 * sorts the result into two populations: pixels still fully inside a stroke
 * after averaging, and pixels safely outside one. The contrast between their
 * means is what a reader at that size actually has to work with — if the
 * strokes have averaged away into the field, the two means converge and this
 * number collapses, which is the failure the brief asks to be tested for.
 */
function thumbnailLegibility(card, mask, rect, targetW) {
  const scale = targetW / card.width
  const small = downscale(card, targetW)
  const smallMask = downscale(mask, targetW)
  let ink = 0
  let inkN = 0
  let gap = 0
  let gapN = 0
  const x1 = Math.min(small.width, Math.ceil((rect.x + rect.width) * scale))
  const y1 = Math.min(small.height, Math.ceil((rect.y + rect.height) * scale))
  for (let y = Math.max(0, Math.floor(rect.y * scale)); y < y1; y++) {
    for (let x = Math.max(0, Math.floor(rect.x * scale)); x < x1; x++) {
      const i = (small.width * y + x) << 2
      const alpha = smallMask.data[i + 3]
      const l = luminance(small.data[i], small.data[i + 1], small.data[i + 2])
      if (alpha >= 240) {
        ink += l
        inkN++
      } else if (alpha <= 15) {
        gap += l
        gapN++
      }
    }
  }
  if (inkN === 0 || gapN === 0) return null
  const li = ink / inkN
  const lg = gap / gapN
  return {
    ratio: (Math.max(li, lg) + 0.05) / (Math.min(li, lg) + 0.05),
    strokePx: inkN,
    height: small.height,
  }
}

// ── run ────────────────────────────────────────────────────────────────────

if (!existsSync(CORE_BUNDLE)) {
  console.error(`✗ ${CORE_BUNDLE} is missing. Run \`pnpm build\` first.`)
  process.exit(1)
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=metal'],
})
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
})

await page.route(CARD_URL, (route) =>
  route.fulfill({ contentType: 'text/html; charset=utf-8', body: CARD_HTML }),
)

// Anything the card's own module throws would otherwise surface only as a
// timeout waiting for __ready, which says nothing about the cause.
page.on('pageerror', (err) => console.error(`  ✗ page error: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error(`  ✗ console: ${msg.text()}`)
})

console.log(`\n▸ dev server\n  ${ORIGIN}`)
await page.goto(CARD_URL, { waitUntil: 'load', timeout: 15_000 })
await page.waitForFunction(() => window.__ready === true, null, { timeout: 15_000 })
await page.waitForTimeout(900) // let the ambient field settle before the cursor

/**
 * A bowed sweep up the right side into the hot spot. Priming matters: a cold
 * pointer has no energy and no trail behind it, which is a picture of a
 * cursor sitting still — the one thing this image must not be.
 */
// Few enough that the whole path is still inside the persistence window at
// trail 0.72; at 46 the tail of the sweep had faded out before the shutter
// and the wake read as an even glow rather than as a direction.
const STEPS = 30
for (let i = 0; i <= STEPS; i++) {
  const t = i / STEPS
  // Ease out, so the approach decelerates and the smoothed position has a
  // chance to catch its target before the shutter.
  const e = 1 - (1 - t) ** 2.2
  // A straight line would read as a ruler. The bow curves the trail inward
  // and down, so the wake is legible as a gesture rather than a vector.
  const bow = Math.sin(t * Math.PI)
  const x = FROM.x + (HOT.x - FROM.x) * e - bow * 74
  const y = FROM.y + (HOT.y - FROM.y) * e + bow * 52
  await page.mouse.move(x, y)
  await page.waitForTimeout(16)
}

// One frame at the hot spot, then freeze. Everything below photographs it.
await page.waitForTimeout(18)
await page.evaluate(() => window.__motes.stop())

console.log('\n▸ pass 1 — the field alone')
await page.evaluate(() => {
  document.getElementById('scrim').classList.add('hidden')
  document.getElementById('copy').classList.add('hidden')
})
const bare = await shot(page)
const core = findCore(bare)
console.log(`  core at ${core.x},${core.y} (${core.samples} px above cut, peak L ${core.max.toFixed(3)})`)
console.log(`  asked for ${HOT.x},${HOT.y} — smoothing lag ${Math.round(Math.hypot(core.x - HOT.x, core.y - HOT.y))}px`)

console.log('\n▸ pass 2 — legibility on the scrim')
await page.evaluate(
  ({ x, y }) => {
    document.getElementById('scrim').classList.remove('hidden')
    const arrow = document.getElementById('arrow')
    arrow.style.left = `${x}px`
    arrow.style.top = `${y}px`
    arrow.classList.remove('hidden')
  },
  { x: core.x, y: core.y },
)
// Boxes for labelling only — which element a failure belongs to. The pixels
// tested inside them are chosen by the ink mask, not by the box.
await page.evaluate(() => document.getElementById('copy').classList.remove('hidden'))
const rects = await page.evaluate(() =>
  ['mark', 'headline', 'sig'].map((id) => {
    const r = document.getElementById(id).getBoundingClientRect()
    return { id, x: r.x, y: r.y, width: r.width, height: r.height }
  }),
)

// The copy alone, on nothing: alpha is the ink.
await page.evaluate(() => document.documentElement.classList.add('mask-only'))
const mask = PNG.sync.read(await page.screenshot({ type: 'png', omitBackground: true }))
await page.evaluate(() => {
  document.documentElement.classList.remove('mask-only')
  document.getElementById('copy').classList.add('hidden')
})

// The field and scrim alone: what that ink will sit on.
const scrimmed = await shot(page)
/**
 * --text as actual sRGB bytes, painted rather than parsed.
 *
 * getComputedStyle().color hands back "oklch(0.935 0.006 258)" verbatim in
 * Chrome — it no longer normalises to rgb() — so scraping digits out of it
 * yields [0, 935, 0] and a contrast ratio of 278:1 against a scale whose
 * ceiling is 21:1. Filling a pixel and reading it back asks the renderer
 * instead of the string.
 */
const TEXT_RGB = await page.evaluate(() => {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'oklch(0.935 0.006 258)'
  ctx.fillRect(0, 0, 1, 1)
  return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
})
let legible = rects.length > 0
if (!legible) console.log('  ✗ measured no text boxes at all')
for (const rect of rects) {
  const measured = worstContrast(scrimmed, mask, rect, TEXT_RGB)
  if (measured === null) {
    legible = false
    console.log(`  ✗ ${rect.id}: no ink found in this box — nothing measured`)
    continue
  }
  const { ratio, at, inked } = measured
  // 4.5:1, the threshold for normal text, although 118px is large text by
  // any definition and would pass at 3:1. The card is not read at 1200px:
  // it is downscaled and re-encoded lossily by whoever renders it, and the
  // margin is what survives that.
  const ok = ratio >= 4.5
  legible &&= ok
  console.log(
    `  ${ok ? '✓' : '✗'} ${rect.id}: worst case ${ratio.toFixed(2)}:1 ` +
      `at ${at.x},${at.y} over ${inked} inked px`,
  )
}
if (!legible) console.log('  the scrim needs another stop — see #scrim in this file')

console.log('\n▸ pass 3 — the card')
await page.evaluate(() => document.getElementById('copy').classList.remove('hidden'))
mkdirSync(PUBLIC, { recursive: true })
const out = join(PUBLIC, 'og.png')
const cardBuf = await page.screenshot({ type: 'png' })
writeFileSync(out, cardBuf)
const card = PNG.sync.read(cardBuf)

/** The size a feed renders this at, which is the size it has to survive. */
const THUMB = 300
console.log(`\n▸ at ${THUMB}px wide`)
const headline = rects.find((r) => r.id === 'headline')
const thumb = thumbnailLegibility(card, mask, headline, THUMB)
if (!thumb) {
  legible = false
  console.log('  ✗ headline vanished entirely at thumbnail size')
} else {
  const ok = thumb.ratio >= 4.5
  legible &&= ok
  console.log(
    `  ${ok ? '✓' : '✗'} headline strokes ${thumb.ratio.toFixed(2)}:1 against the ` +
      `gaps between them (${THUMB}×${thumb.height}, ${thumb.strokePx} stroke px)`,
  )
  if (!ok) console.log('  the type has to get bigger — see h1 font-size in this file')
}

// ── favicons ───────────────────────────────────────────────────────────────
// Rendered from the same favicon.svg the page already links, so the mark has
// one definition and the rasters cannot drift from it.
console.log('\n▸ favicons')
for (const [name, size] of [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
]) {
  const icon = await browser.newPage({ viewport: { width: size, height: size } })
  await icon.goto(`${ORIGIN}/favicon.svg`, { waitUntil: 'load' })
  await icon.screenshot({ path: join(PUBLIC, name), type: 'png' })
  await icon.close()
  console.log(`  ${name}  ${size}×${size}`)
}

await browser.close()

const bytes = statSync(out).size
const kb = (bytes / 1024).toFixed(0)
console.log(`\n▸ og.png\n  ${W}×${H}, ${kb}KB`)
const small = bytes <= 1024 * 1024
if (small) {
  console.log('  ✓ under 1MB')
} else {
  console.log('  ✗ over 1MB — lower FIELD.density before touching the design')
}

// The file is written either way: a card that failed a check is far easier to
// fix by looking at it. The exit code is what stops it being mistaken for one
// that passed.
if (!legible || !small) {
  console.error('\n✗ the card was written, but it does not pass. Do not ship it.\n')
  process.exit(1)
}
console.log('')
