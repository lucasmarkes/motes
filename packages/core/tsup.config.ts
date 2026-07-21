import { defineConfig } from 'tsup'

/**
 * `.glsl` / `.vert` / `.frag` are inlined as strings via esbuild's `text`
 * loader, so the published bundle carries its shaders inline and consumers
 * need no build-tool configuration of their own.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  loader: {
    '.glsl': 'text',
    '.vert': 'text',
    '.frag': 'text',
  },
})
