import { defineConfig } from 'vitest/config'

// The controls-rail height budget stands apart from the fast unit run. It boots
// the real app through Vite and drives a browser via Playwright to measure the
// rendered rail — the only check that can prove a layout property jsdom cannot
// see. It configures its own Vite server inside the test, so this config is
// deliberately bare, and the generous timeout covers server boot + first paint.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lab/layout.test.ts'],
    testTimeout: 30_000,
  },
})
