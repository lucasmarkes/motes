<div align="center">

![motes](assets/hero.gif)

# motes

**Procedural, pointer-reactive ASCII backgrounds for the web.**

Drop-in for React and vanilla. Zero runtime dependencies.

</div>

---

## Why this exists

The ASCII-on-the-web space splits into two camps.

Authoring tools export baked frames, so they cannot react to anything at
runtime. Procedural galleries animate from time alone — their render signature
is literally `render(time)`.

motes is `render(time, pointer)`. The cursor is a first-class input.

## Install

```sh
npm i @lucasmarkes/motes         # core, zero runtime dependencies
npm i @lucasmarkes/motes-react   # React wrapper
```

## Usage

```ts
import { createMotes } from '@lucasmarkes/motes'

const field = createMotes(canvas, { effect: 'flow', pointer: true })
field.start()
```

```tsx
import { Motes } from '@lucasmarkes/motes-react'

<Motes effect="flow" pointer className="fixed inset-0 -z-10 h-full w-full pointer-events-none" />
```

Sizing comes from CSS. Give the canvas a box and the field follows it, across
resizes and monitor-to-monitor DPI changes.

## The golden rule

The pointer interaction is an orthogonal layer that crosses every effect. It is
never an effect itself.

Adding an effect means writing one GLSL function:

```ts
import { defineEffect } from '@lucasmarkes/motes'

defineEffect('rain', {
  glsl: `
    float field(vec2 cell, float t) {
      float lane  = fract(sin(cell.x * 91.7) * 4321.0);
      float speed = 0.5 + lane * 1.1;
      float drop  = fract(cell.y * 0.05 - t * speed + lane * 7.0);
      float head  = smoothstep(0.0, 0.05, drop) * pow(1.0 - drop, 5.0);
      return head * (0.55 + lane * 0.45);
    }
  `,
})
```

That effect now reacts to the cursor. You wrote no pointer code.

The renderer assembles the fragment shader as `common → your field() → shared
pointer pass → main`, and the pointer contribution is added after `field()`
returns. An effect cannot see or override it — the orthogonality is structural,
not a convention, and there are tests that fail if it ever stops being true.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `effect` | `'flow'` | `'flow'`, `'waves'`, `'pulse'`, or your own. |
| `pointer` | `true` | Whether the field reacts to the cursor. |
| `radius` | `150` | Pointer influence radius, in CSS pixels. |
| `force` | `1.4` | Pointer force strength. |
| `speed` | `1.0` | Ambient animation speed multiplier. |
| `density` | `13` | Cell size in CSS pixels. Smaller is denser. |
| `charset` | `' .:-=+*#%@'` | Dark-to-bright glyph ramp. Index 0 must be a space. |
| `accent` | `'#d8531f'` | Colour the field intensifies toward. |
| `trail` | `0.3` | Phosphor persistence, 0 to 1. |

Every option is live: `field.set({ force: 2, effect: 'waves' })`.

## Copy-paste install

Prefer owning the code? The shadcn registry ships drop-in background
components — a base `<MotesBackground />` plus three preconfigured effects.

```sh
npx shadcn@latest add https://motes.lucasmarkes.com/r/motes-flow-background.json
```

See [`registry/README.md`](registry/README.md).

## How it works

One WebGL2 fragment shader over a full-screen triangle, plus a glyph atlas
rendered from your charset. Per fragment: resolve the cell, evaluate the
effect, add the shared pointer force, quantise to a glyph, sample the atlas,
and composite over the previous frame decayed toward the background.

Pointer events are read from the window and hit-tested against the canvas box,
so a field placed behind your content can carry `pointer-events: none` — it
never swallows a click, and still reacts as the cursor crosses whatever is
stacked on top.

The pointer smoothing is frame-rate independent, anchored so that 60Hz
reproduces the reference calibration exactly.

Requires WebGL2.

## Troubleshooting

Two CSS traps turn a working renderer into a blank page. Both look like a bug in
motes; neither is. In development the field detects each one and prints a
one-time console warning naming the exact fix — this is what those say.

**The field sits tiny in a corner.** `<canvas>` is a replaced element with an
intrinsic 300×150 size, so pinning alone — `fixed inset-0`, `absolute inset-0` —
does not stretch it: with `width: auto` the inset equation is over-constrained
and the intrinsic size wins. Add `h-full w-full` (or `width: 100%; height:
100%`) and it fills the box you pinned it to.

**The field draws but nothing shows, behind a negative z-index.** Once `<html>`
*and* `<body>` both carry a background colour, `<body>`'s stops propagating to
the viewport and paints as an ordinary block background — above anything at a
negative z-index. Keep the background on exactly one of them, or drop the
negative z-index and stack your content above instead.

Both warnings are development-only and compile out of production builds. If a
layout is deliberate, silence its warning with `<canvas data-motes-quiet>` — the
React wrapper forwards the attribute.

One sibling of the second trap the field does **not** warn about: an `absolute`
negative-z canvas nested inside a *positioned parent that has its own opaque
background and does not establish a stacking context* — the parent's background
paints over it. The `fixed` snippet above is immune, because its containing
block is the viewport, not the parent. If you must nest under `absolute`, give
that parent a stacking context (`isolation: isolate`) so the negative z-index
resolves inside it, move its background elsewhere, or layer content above with a
positive z-index. This one is documented rather than detected on purpose:
telling it apart from a correct layout would mean reimplementing the CSS
stacking-context algorithm, and its wrong answer is a false positive — the one
failure the diagnostic can't afford.

## Packages

| Path | Package | What it is |
| --- | --- | --- |
| `packages/core` | `@lucasmarkes/motes` | Renderer, effects, pointer layer |
| `packages/react` | `@lucasmarkes/motes-react` | `<Motes />` wrapper |
| `apps/playground` | — | Demo site |
| `registry/` | — | shadcn-compatible copy-paste items |

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm dev        # playground at localhost:5173
```

Adding an effect, the repo layout, and the golden rule that keeps every effect
pointer-blind: [`CONTRIBUTING.md`](CONTRIBUTING.md).

Publishing runs through a gate that builds, tests, packs, and inspects the
tarballs before printing the publish commands:

```sh
pnpm release    # checks only; never publishes
```

## License

MIT
