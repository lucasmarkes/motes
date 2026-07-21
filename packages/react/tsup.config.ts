import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external: ['react', 'motes'],
})
