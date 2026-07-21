# motes

Procedural, pointer-reactive ASCII backgrounds for the web. Drop-in for React and vanilla.

A grid of monospace characters, generated in a single WebGL2 fragment shader, that reacts to the cursor in real time.

## Why

The ASCII-on-the-web space splits into two camps. Authoring tools export baked frames, so they can't react to anything at runtime. Procedural galleries animate from time alone — their render signature is literally `render(time)`.

motes is `render(time, pointer)`. The cursor is a first-class input.

## The golden rule

The pointer interaction is an orthogonal layer that crosses every effect. It is never an effect itself.

Any effect with `pointer: true` reacts to the cursor with zero per-effect pointer code. The renderer assembles the fragment shader as `common → your field() → shared pointer pass → main`, and the pointer contribution is added after `field()` returns. An effect cannot see or override it.

Adding an effect means writing one GLSL function:

```glsl
float field(vec2 cell, float t) { /* returns 0..1 */ }
```

The cursor then works automatically. That is the test that the rule held.

## Install

```sh
npm i motes          # core, zero runtime dependencies
npm i @motes/react   # React wrapper
```

## Usage

```ts
import { createMotes } from 'motes'

const instance = createMotes(canvas, { effect: 'flow', pointer: true })
instance.start()
```

```tsx
import { Motes } from '@motes/react'

<Motes effect="flow" pointer className="fixed inset-0 -z-10" />
```

## Packages

| Path                 | Package         | What it is                          |
| -------------------- | --------------- | ----------------------------------- |
| `packages/core`      | `motes`         | Renderer, effects, pointer layer     |
| `packages/react`     | `@motes/react`  | `<Motes />` wrapper                  |
| `apps/playground`    | —               | Demo site                            |
| `registry/`          | —               | shadcn-compatible copy-paste items   |

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm dev
```

## Status

Phase 2 — effect architecture and phosphor feedback. All three effects ship as
pluggable GLSL, `defineEffect` registers new ones, `trail` is live via a
ping-pong feedback pass, and pointer smoothing is frame-rate independent
(60Hz remains the calibration reference).

## License

MIT
