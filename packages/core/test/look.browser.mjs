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

await browser.close()
server.close()

if (failed) {
  console.error(`\n[look] ${failed} case(s) drifted.`)
  process.exit(1)
}
console.log(`\n[look] ${CASES.length - captured} compared, ${captured} captured. All good.`)
