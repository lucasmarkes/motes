import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

/** Mirror tsup's text loader so tests import `.glsl` the same way the build does. */
export default defineConfig({
  plugins: [
    {
      name: 'motes:glsl-text',
      load(id) {
        if (!/\.(glsl|vert|frag)$/.test(id)) return null
        return `export default ${JSON.stringify(readFileSync(id, 'utf8'))}`
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
