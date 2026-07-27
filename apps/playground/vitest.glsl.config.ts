import { defineConfig } from 'vitest/config'

// The GLSL compile gate stands apart from the fast unit run. It drives a real
// browser through Playwright to compile each generated field() in an actual
// WebGL2 context — the only check that can tell valid GLSL from broken. It
// needs none of the app's Vite plugins, so this config is deliberately bare.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lab/compile.test.ts'],
  },
})
