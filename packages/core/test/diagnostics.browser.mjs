/**
 * Browser regression lock for the runtime diagnostics. The unit tests prove the
 * pure `diagnose` logic; this proves the DOM read that feeds it, end to end,
 * against the built bundle in real Chromium — the part jsdom cannot cover.
 *
 * The gating assertion leads: the documented snippet must produce zero
 * warnings. Then Mode A red/green, and the four-cell occlusion matrix as a
 * regression lock, asserting the warning fires in exactly the opaque/opaque
 * cell.
 *
 * Not wired into `pnpm test` / CI — CI has no browser. Run it directly after a
 * build:  pnpm -C packages/core build && pnpm -C packages/core test:browser
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = join(HERE, '..', 'dist', 'index.js')
const ARM_DELAY_MS = 1000

const HARNESS = `<!doctype html><html><head>
<style>html, body { margin: 0; height: 100%; }</style>
</head><body><script type="module">
  import { createMotes } from '/index.js'
  window.__setup = (cfg) => {
    document.documentElement.style.background = cfg.htmlBg
    document.body.style.background = cfg.bodyBg
    const c = document.createElement('canvas')
    c.style.cssText = cfg.canvasCss
    if (cfg.quiet) c.setAttribute('data-motes-quiet', '')
    document.body.appendChild(c)
    createMotes(c, { effect: 'flow', pointer: true }).start()
  }
</script></body></html>`

// The documented React snippet, as CSS: fixed inset-0 -z-10 h-full w-full.
const DOCUMENTED = 'position:fixed; inset:0; z-index:-10; height:100%; width:100%; pointer-events:none;'
// The same, minus h-full w-full — the replaced element collapses to 300×150.
const UNSIZED = 'position:fixed; inset:0; z-index:-10; pointer-events:none;'
const T = 'rgba(0, 0, 0, 0)' // transparent
const O = 'rgb(15, 15, 20)' // opaque

const CASES = [
  // GATING — the documented snippet, on an ordinary page, must be silent.
  { name: 'GATING: documented snippet, transparent page', canvasCss: DOCUMENTED, htmlBg: T, bodyBg: T, warns: false },

  // Mode A — red then green.
  { name: 'Mode A red: no h-full w-full → 300×150', canvasCss: UNSIZED, htmlBg: T, bodyBg: T, warns: 'unsized' },
  { name: 'Mode A green: sized, no warning', canvasCss: DOCUMENTED, htmlBg: T, bodyBg: T, warns: false },
  { name: 'Mode A silenced by data-motes-quiet', canvasCss: UNSIZED, htmlBg: T, bodyBg: T, quiet: true, warns: false },

  // Mode B — the four-cell background matrix.
  { name: 'matrix html T / body T', canvasCss: DOCUMENTED, htmlBg: T, bodyBg: T, warns: false },
  { name: 'matrix html O / body T', canvasCss: DOCUMENTED, htmlBg: O, bodyBg: T, warns: false },
  { name: 'matrix html T / body O', canvasCss: DOCUMENTED, htmlBg: T, bodyBg: O, warns: false },
  { name: 'matrix html O / body O → occluded', canvasCss: DOCUMENTED, htmlBg: O, bodyBg: O, warns: 'occluded' },
]

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

await new Promise((r) => server.listen(0, r))
const base = `http://localhost:${server.address().port}/`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })

const motesWarnings = []
page.on('console', (msg) => {
  if (msg.type() === 'warning' && msg.text().includes('[motes]')) motesWarnings.push(msg.text())
})

let failures = 0
console.log('\nDIAGNOSTICS — browser regression\n')

for (const c of CASES) {
  await page.goto(base)
  await page.waitForFunction(() => typeof window.__setup === 'function')
  motesWarnings.length = 0
  await page.evaluate((cfg) => window.__setup(cfg), c)
  await page.waitForTimeout(ARM_DELAY_MS + 250)

  const fired = motesWarnings[0]?.match(/300×150|opaque background/)
    ? motesWarnings[0].includes('300×150')
      ? 'unsized'
      : 'occluded'
    : motesWarnings.length > 0
      ? 'unknown'
      : false
  const ok = fired === c.warns
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${c.name}  →  expected ${c.warns}, got ${fired}`)
}

console.log()
await browser.close()
server.close()

if (failures > 0) {
  console.error(`✗ ${failures} case(s) failed.\n`)
  process.exit(1)
}
console.log('✓ All diagnostics cases pass — the documented snippet is silent.\n')
