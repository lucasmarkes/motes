/**
 * Golden-image lock for the rendered look.
 *
 * The unit tests prove pure logic and the shader's source order; nothing
 * proves that a change to the colour pipeline leaves the picture alone. This
 * does, by rendering the built bundle in real Chromium and comparing pixels.
 *
 * Determinism comes from the config, not from luck: `speed: 0` evaluates the
 * effect at t=0 forever, `pointer: false` makes pointerForce return on its
 * first line, and `trail: 0` sets the fade to 1 so no frame depends on the
 * accumulation history. Every frame is the same frame.
 *
 * Not wired into `pnpm test` / CI — CI has no browser. `test:look` builds
 * first, so the bundle under comparison can never be stale relative to
 * `src/`. Run it directly with:
 *   pnpm -C packages/core test:look
 * Capture or re-capture baselines with:
 *   pnpm -C packages/core test:look -- --update
 */
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = join(HERE, '..', 'dist', 'index.js')
const GOLDEN = join(HERE, 'golden')

const UPDATE = process.argv.includes('--update')

/** Per-channel tolerance. The ramp rework is accurate to 0.68/255 by
 *  construction; 2 absorbs that plus any driver rounding. */
const TOLERANCE = 2

const W = 320
const H = 200

const HARNESS = `<!doctype html><html><head>
<style>html, body { margin: 0; background: #000; }
canvas { display: block; width: ${W}px; height: ${H}px; }</style>
</head><body><script type="module">
  import { createMotes } from '/index.js'
  window.__render = (cfg) => {
    const c = document.createElement('canvas')
    c.id = 'field'
    c.setAttribute('data-motes-quiet', '')
    document.body.appendChild(c)
    // speed 0 + pointer off + trail 0 => every frame is identical.
    createMotes(c, { ...cfg, speed: 0, pointer: false, trail: 0 }).start()
  }
  // Used only by the property assertions below, not by the golden loop.
  // The WebGL context has no preserveDrawingBuffer, so the drawing buffer is
  // only guaranteed to hold the just-drawn frame until the next implicit
  // clear — which can happen before a later, separately-scheduled evaluate()
  // gets to read it. Reading toDataURL from inside a rAF callback registered
  // after motes' own (so it runs right after that frame's draw, same task)
  // is what makes the read reliable.
  window.__capture = (cfg) => new Promise((resolve) => {
    const c = document.createElement('canvas')
    c.id = 'field'
    c.setAttribute('data-motes-quiet', '')
    document.body.appendChild(c)
    const m = createMotes(c, { ...cfg, speed: 0, pointer: false, trail: 0 })
    m.start()
    let n = 0
    function grab() {
      if (++n < 3) { requestAnimationFrame(grab); return }
      const url = c.toDataURL('image/png')
      m.stop()
      resolve(url)
    }
    requestAnimationFrame(grab)
  })
  // Used only by the reduced-motion property assertion below. Captures two
  // frames from the SAME instance's own rAF-driven clock, at frame counts far
  // apart, instead of two separately-launched pages compared by wall-clock
  // screenshot timing. That cross-process comparison is what made an earlier
  // golden-image version of this check ~50% flaky: a continuously-animating
  // field can coincidentally look alike from momentary phase alignment
  // between two independent renders. One instance's own clock forecloses
  // that — if the freeze is honoured, elapsed rAF ticks cannot move a single
  // pixel; if it is not, cfg.speed guarantees the field has advanced by the
  // later frame.
  window.__captureTwo = (cfg, n1, n2) => new Promise((resolve) => {
    const c = document.createElement('canvas')
    c.id = 'field'
    c.setAttribute('data-motes-quiet', '')
    document.body.appendChild(c)
    const m = createMotes(c, { ...cfg, pointer: false, trail: 0 })
    m.start()
    let n = 0
    let first = null
    function grab() {
      if (++n === n1) first = c.toDataURL('image/png')
      if (n < n2) { requestAnimationFrame(grab); return }
      const second = c.toDataURL('image/png')
      m.stop()
      resolve([first, second])
    }
    requestAnimationFrame(grab)
  })
</script></body></html>`

/** Cases without a golden file are captured and reported, never failed. */
const CASES = [
  { name: 'flow-default', config: { effect: 'flow' } },
  { name: 'waves-default', config: { effect: 'waves' } },
  { name: 'pulse-default', config: { effect: 'pulse' } },
]

function compare(actualBuf, expectedBuf) {
  const a = PNG.sync.read(actualBuf)
  const b = PNG.sync.read(expectedBuf)
  if (a.width !== b.width || a.height !== b.height) {
    return `size ${a.width}x${a.height} != golden ${b.width}x${b.height}`
  }
  let worst = 0
  let count = 0
  for (let i = 0; i < a.data.length; i++) {
    const d = Math.abs(a.data[i] - b.data[i])
    if (d > TOLERANCE) count++
    if (d > worst) worst = d
  }
  return count === 0 ? null : `${count} channel samples over tolerance, worst ${worst}/255`
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/index.js') {
      res.setHeader('content-type', 'text/javascript')
      res.end(await readFile(DIST))
    } else {
      res.setHeader('content-type', 'text/html')
      res.end(HARNESS)
    }
  } catch (err) {
    res.statusCode = 500
    res.end(String(err))
  }
})

if (!existsSync(DIST)) {
  console.error(`[look] no build at ${DIST} — run \`pnpm -C packages/core build\` first`)
  process.exit(1)
}

await mkdir(GOLDEN, { recursive: true })
await new Promise((r) => server.listen(0, r))
const port = server.address().port

const browser = await chromium.launch()
let failed = 0
let captured = 0

for (const kase of CASES) {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 })
  await page.goto(`http://127.0.0.1:${port}/`)
  await page.evaluate((cfg) => window.__render(cfg), kase.config)
  // Two rAF-driven frames is plenty when every frame is identical; the wait
  // is for first paint and shader compilation, not for the animation.
  await page.waitForTimeout(300)

  const shot = await page.locator('#field').screenshot()
  const file = join(GOLDEN, `${kase.name}.png`)

  if (UPDATE || !existsSync(file)) {
    await writeFile(file, shot)
    console.log(`  captured  ${kase.name}`)
    captured++
  } else {
    const diff = compare(shot, await readFile(file))
    if (diff) {
      await writeFile(join(GOLDEN, `${kase.name}.actual.png`), shot)
      console.error(`  FAIL      ${kase.name} — ${diff}`)
      console.error(`            wrote ${kase.name}.actual.png for inspection`)
      failed++
    } else {
      console.log(`  ok        ${kase.name}`)
    }
  }
  await page.close()
}

// ---------------------------------------------------------------------------
// Property assertions for background / ink / contrast / brightness / reduced
// motion.
//
// The golden cases above only ever exercise the four defaults, so they prove
// the uniforms are *uploaded* (if they weren't, the picture would be black),
// not that a non-default value actually reaches its uniform and moves the
// picture the way main.frag says it must. These read raw canvas pixels via
// `toDataURL` (straight alpha, independent of page compositing — unlike a
// screenshot, which would flatten a transparent canvas onto the harness's
// black page background) and assert a direction and a rough margin predicted
// from the shader math, never an exact value. That is deliberate: a golden
// image for a brand-new option would only ever capture whatever the current
// code happens to produce, silently enshrining a plumbing bug instead of
// catching one.
async function readPixels(config) {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 })
  await page.goto(`http://127.0.0.1:${port}/`)
  const dataUrl = await page.evaluate((cfg) => window.__capture(cfg), config)
  await page.close()
  return PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'))
}

/**
 * Like `readPixels`, but for the reduced-motion check: returns two frames
 * from one instance's own rAF clock, `n1` and `n2` ticks in, rather than one
 * frame from one page. `reducedMotion` sets the page's emulated
 * `prefers-reduced-motion` media feature, which is the only lever this test
 * has on the library's own `matchMedia` read — there is no config option for
 * it.
 */
async function readPixelsPair(config, n1, n2, reducedMotion) {
  const page = await browser.newPage({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 1,
    reducedMotion: reducedMotion ?? 'no-preference',
  })
  await page.goto(`http://127.0.0.1:${port}/`)
  const [url1, url2] = await page.evaluate(
    ({ cfg, n1, n2 }) => window.__captureTwo(cfg, n1, n2),
    { cfg: config, n1, n2 },
  )
  await page.close()
  return [
    PNG.sync.read(Buffer.from(url1.split(',')[1], 'base64')),
    PNG.sync.read(Buffer.from(url2.split(',')[1], 'base64')),
  ]
}

/** Largest single-channel difference between two same-size PNGs. Unlike
 *  `compare()`, this has no tolerance and no golden file — it is used to
 *  assert bit-for-bit equality between two frames of the same running
 *  instance, not a screenshot against a stored baseline. */
function maxChannelDiff(a, b) {
  let worst = 0
  for (let i = 0; i < a.data.length; i++) {
    const d = Math.abs(a.data[i] - b.data[i])
    if (d > worst) worst = d
  }
  return worst
}

function luma(png, i) {
  return 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]
}

/** Average colour of the `fraction` of pixels at either luma extreme —
 *  cheaper and less noise-prone than reading a single darkest/brightest
 *  pixel, and still isolates the tier a given option should dominate. */
function extremeAverage(png, fraction, end) {
  const n = png.width * png.height
  const order = Array.from({ length: n }, (_, p) => p)
  order.sort((a, b) => luma(png, a * 4) - luma(png, b * 4))
  const slice = end === 'dark'
    ? order.slice(0, Math.max(1, Math.floor(n * fraction)))
    : order.slice(-Math.max(1, Math.floor(n * fraction)))
  let r = 0, g = 0, b = 0, a = 0
  for (const p of slice) {
    const i = p * 4
    r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; a += png.data[i + 3]
  }
  return { r: r / slice.length, g: g / slice.length, b: b / slice.length, a: a / slice.length }
}

function stats(png) {
  const n = png.width * png.height
  let sum = 0
  let minAlpha = 255
  for (let p = 0; p < n; p++) {
    const i = p * 4
    sum += luma(png, i)
    if (png.data[i + 3] < minAlpha) minAlpha = png.data[i + 3]
  }
  return { mean: sum / n, minAlpha }
}

/**
 * Standard deviation of block-averaged luma, blocks sized to roughly one
 * default cell (`w: max(5, density * 0.6), h: density`, so ~8x13 at the
 * default density 13). A per-pixel stdDev is swamped by glyph-stroke
 * antialiasing texture that exists at any contrast — the same glyph tiled
 * everywhere still alternates between ink and background inside its own
 * shape. Averaging over a cell first leaves only cell-to-cell variation,
 * which is exactly what `contrast` controls.
 */
function blockLumaStdDev(png, bw = 8, bh = 13) {
  const blocks = []
  for (let by = 0; by < png.height; by += bh) {
    for (let bx = 0; bx < png.width; bx += bw) {
      let sum = 0, count = 0
      for (let y = by; y < Math.min(by + bh, png.height); y++) {
        for (let x = bx; x < Math.min(bx + bw, png.width); x++) {
          sum += luma(png, (y * png.width + x) * 4)
          count++
        }
      }
      blocks.push(sum / count)
    }
  }
  const mean = blocks.reduce((a, b) => a + b, 0) / blocks.length
  return Math.sqrt(blocks.reduce((a, b) => a + (b - mean) ** 2, 0) / blocks.length)
}

let propFailed = 0
let propTotal = 0
function assertProp(name, condition, detail) {
  propTotal++
  if (condition) {
    console.log(`  ok        ${name}`)
  } else {
    console.error(`  FAIL      ${name} — ${detail}`)
    propFailed++
  }
}

console.log('\n[look] property assertions (non-default options)\n')

// background: a strongly-coloured, opaque background should dominate the
// darkest 2% of pixels — the near-empty cells that early-out to `faded`,
// which equals `u_background` exactly when trail is 0 — and that tier's hue
// should read as the configured colour, not the near-black default.
{
  const dflt = extremeAverage(await readPixels({ effect: 'flow' }), 0.02, 'dark')
  const blue = extremeAverage(await readPixels({ effect: 'flow', background: '#0000ff' }), 0.02, 'dark')
  assertProp(
    'background: blue dominates the darkest tier',
    blue.b > blue.r + 40 && blue.b > blue.g + 40 && blue.b > dflt.b + 100,
    `blue tier rgb(${blue.r.toFixed(1)},${blue.g.toFixed(1)},${blue.b.toFixed(1)}) vs default blue channel ${dflt.b.toFixed(1)}`,
  )
}

// background: 'transparent' zeroes alpha on those same early-out cells
// (premultiply(0,0,0,0) = (0,0,0,0)); the opaque default forces alpha to 1
// on every pixel (dimA/colA both collapse to 1 when background.a = 1), so
// the two minimums should sit far apart.
{
  const opaque = stats(await readPixels({ effect: 'flow' }))
  const transparent = stats(await readPixels({ effect: 'flow', background: 'transparent' }))
  assertProp(
    "background: 'transparent' drops alpha where opaque holds it at 255",
    opaque.minAlpha >= 250 && transparent.minAlpha <= 50 && opaque.minAlpha - transparent.minAlpha > 150,
    `opaque minAlpha ${opaque.minAlpha}, transparent minAlpha ${transparent.minAlpha}`,
  )
}

// ink: forcing contrast to 0 and brightness to a fixed offset makes `val`
// (and so `ramp` and the accent mix `m`) an identical constant on every
// pixel regardless of the field, isolating `dim = mix(background, ink,
// ramp)` from the field's own variation. A saturated ink should then read
// as that hue on the brightest tier (full glyph coverage), where the
// default warm-grey ink does not.
{
  const base = { effect: 'flow', contrast: 0, brightness: -0.3 }
  const dflt = extremeAverage(await readPixels(base), 0.02, 'bright')
  const green = extremeAverage(await readPixels({ ...base, ink: '#00ff00' }), 0.02, 'bright')
  assertProp(
    'ink: green ink raises the green channel of the lit tier',
    green.g > green.r + 30 && green.g > dflt.g + 40,
    `green tier rgb(${green.r.toFixed(1)},${green.g.toFixed(1)},${green.b.toFixed(1)}) vs default green channel ${dflt.g.toFixed(1)}`,
  )
}

// brightness: raises `v` (and so how far cells push into the ramp/accent
// mix) before clamping, which can only raise or hold the image's mean luma,
// never lower it.
{
  const dflt = stats(await readPixels({ effect: 'flow' }))
  const bright = stats(await readPixels({ effect: 'flow', brightness: 0.6 }))
  assertProp(
    'brightness: raised brightness raises mean luma',
    bright.mean > dflt.mean + 5,
    `default mean ${dflt.mean.toFixed(1)}, brightness:0.6 mean ${bright.mean.toFixed(1)}`,
  )
}

// contrast: 0 collapses `v` to the single constant `0.5 + brightness`
// everywhere, so cell-to-cell colour stops tracking the field; only the
// glyph's own raster texture is left, so the *cell-to-cell* luma spread
// should collapse relative to the default's field-driven spread (measured
// per-block, not per-pixel — see blockLumaStdDev).
{
  const dflt = blockLumaStdDev(await readPixels({ effect: 'flow' }))
  const flat = blockLumaStdDev(await readPixels({ effect: 'flow', contrast: 0 }))
  assertProp(
    'contrast: 0 collapses the cell-to-cell luma spread of the field',
    flat < dflt * 0.5,
    `default block stdDev ${dflt.toFixed(1)}, contrast:0 block stdDev ${flat.toFixed(1)}`,
  )
}

// reduced motion: a field animating on its own is exactly the autoplaying
// motion WCAG 2.2.2 targets. `speed: 1` on its own would move the field
// continuously, so if `prefers-reduced-motion: reduce` is honoured, frame 3
// and frame 120 of the SAME instance's own rAF clock must be bit-identical —
// `u_time * u_speed` in main.frag collapses to 0 regardless of how much
// elapsed time `u_time` carries once `u_speed` is actually 0. Comparing two
// frames from one running instance, rather than a screenshot against a
// stored baseline from a separately-launched page, is what makes this a
// direction-and-margin-free, exact check with no cross-process wall-clock
// dependency to introduce flakiness.
{
  const [early, late] = await readPixelsPair({ effect: 'flow', speed: 1 }, 3, 120, 'reduce')
  const diff = maxChannelDiff(early, late)
  assertProp(
    'reduced motion: frozen field is pixel-identical from frame 3 to frame 120',
    diff === 0,
    `max channel diff ${diff}/255 between frame 3 and frame 120`,
  )
}

await browser.close()
server.close()

if (failed || propFailed) {
  console.error(`\n[look] ${failed} golden case(s) drifted, ${propFailed} property assertion(s) failed.`)
  process.exit(1)
}
console.log(`\n[look] ${CASES.length - captured} compared, ${captured} captured, ${propTotal} property assertions passed. All good.`)
