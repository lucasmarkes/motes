import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { chromium, type Browser } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'

// "No scroll at a normal viewport" is the controls rail's binding requirement,
// and it is a layout property — jsdom has no layout engine, so `scrollHeight`
// there is always 0 and can prove nothing. This boots the real app through Vite
// in-process, renders /lab in a real browser at the two desktop sizes the design
// commits to, and asserts the rail's content fits its column without overflow.
//
// This is the standing counterpart to the `overflow-y: auto` net on the rail:
// the net serves variance a reader brings (text zoom, a substituted font), this
// catches a regression we cause (a fifth control that pushes the budget over).
// Each does the job it is suited for; neither is a substitute for the other.
//
// It drives a real browser, so — like the GLSL compile gate — it stays out of
// the fast unit run and is invoked on demand through `test:layout`.

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const CONFIG = fileURLToPath(new URL('../../vite.config.ts', import.meta.url))

let server: ViteDevServer
let browser: Browser
let base: string

beforeAll(async () => {
  // Port 0: take any free port, so a running dev server never collides with the
  // test. The app's own vite.config supplies the React plugin that transforms
  // the TSX; logLevel silent keeps the server's boot chatter out of the report.
  server = await createServer({
    root: ROOT,
    configFile: CONFIG,
    server: { port: 0 },
    logLevel: 'silent',
  })
  await server.listen()
  base = server.resolvedUrls!.local[0]!
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

// 1440×900 is the tighter desktop target and, being below 1600, also exercises
// the two-column tier where the code has collapsed to a slide-over; 1920×1080 is
// the wide, three-column tier. The rail is a fixed 420px in both, so its height
// is a function of content, not window width — the budget must hold at each.
for (const [w, h] of [
  [1920, 1080],
  [1440, 900],
] as const) {
  test(`controls rail fits its column without scrolling at ${w}x${h}`, async () => {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    try {
      await page.goto(`${base}lab`, { waitUntil: 'networkidle' })
      const rail = page.locator('.lab-controls')
      await rail.waitFor()
      const { scrollH, clientH } = await rail.evaluate((el) => ({
        scrollH: el.scrollHeight,
        clientH: el.clientHeight,
      }))
      // scrollHeight <= clientHeight is exactly "no scrollbar needed": the
      // content fits the column. With overflow-y: auto that is also "the net
      // never engaged" — the budget held on its own, as designed.
      expect(
        scrollH,
        `controls rail overflowed at ${w}x${h}: ${scrollH}px of content in a ${clientH}px column`,
      ).toBeLessThanOrEqual(clientH)
    } finally {
      await page.close()
    }
  })
}
