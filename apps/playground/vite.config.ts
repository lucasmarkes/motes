import react from '@vitejs/plugin-react'
// From vitest, not vite: vite's own `defineConfig` has no `test` key in its
// type, so the config below only typechecks against this one.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // jsdom for `stars.ts` alone, which is the only module here with logic
  // rather than layout — a cache with a TTL and four ways to fail, none of
  // which a screenshot can prove. Everything else on this page is verified by
  // measuring the rendered page.
  test: { environment: 'jsdom' },
})
