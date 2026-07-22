import react from '@vitejs/plugin-react'
// From vitest, not vite: vite's own `defineConfig` has no `test` key in its
// type, so the config below only typechecks against this one.
import { defineConfig, type Plugin } from 'vitest/config'
import { resolveBase } from '../../scripts/base-url.mjs'

/**
 * Put the origin into the OG tags, and nowhere else.
 *
 * `index.html` is otherwise strictly relative — it never needs to know where
 * it is served from. Crawlers break that: `og:image` and `og:url` are not
 * resolved against the document, so a relative path there is dropped and the
 * card renders bare. The hostname therefore has to reach the output, and the
 * rule narrows rather than being abandoned: source holds `%BASE%`, only the
 * built HTML holds a host, and the value comes from the same ladder the
 * registry uses (scripts/base-url.mjs) — so a preview deploy advertises its
 * own image for the same reason its registry items install from itself.
 */
function baseUrlTags(): Plugin {
  return {
    name: 'motes-base-url-tags',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const { url, source } = resolveBase()
        const base = url.replace(/\/+$/, '')
        console.log(`[html] %BASE% → ${base} (from ${source})`)
        // Not replaceAll (ES2021, above this workspace's ES2020 target) and
        // not replace(/…/g, base) — a `$` in the replacement would be read as
        // a capture reference. split/join treats it as the literal it is.
        return html.split('%BASE%').join(base)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), baseUrlTags()],
  server: { port: 5173 },
  // jsdom for `stars.ts` alone, which is the only module here with logic
  // rather than layout — a cache with a TTL and four ways to fail, none of
  // which a screenshot can prove. Everything else on this page is verified by
  // measuring the rendered page.
  test: { environment: 'jsdom' },
})
