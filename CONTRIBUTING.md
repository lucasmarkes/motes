# Contributing to motes

The most useful contribution is a new effect, so that's where this starts. The
walkthrough doubles as the architecture: understand how an effect stays
pointer-blind and you understand the renderer.

## Adding an effect

An effect is one GLSL function:

```glsl
float field(vec2 cell, float t)   // returns 0..1
```

`cell` is the integer grid cell being drawn, `t` is elapsed seconds (already
scaled by the `speed` option). Return the field's intensity at that cell, 0 for
empty, 1 for brightest. That is the entire contract. No inputs, no outputs, no
setup beyond that signature.

Here is `rain`, the fourth tile on the playground — six lines, registered at
runtime, real and in the repo at [`apps/playground/src/effects.ts`](apps/playground/src/effects.ts):

```glsl
float field(vec2 cell, float t) {
  float lane  = fract(sin(cell.x * 91.7) * 4321.0);
  float speed = 0.5 + lane * 1.1;
  float drop  = fract(cell.y * 0.05 - t * speed + lane * 7.0);
  float head  = smoothstep(0.0, 0.05, drop) * pow(1.0 - drop, 5.0);
  return head * (0.55 + lane * 0.45);
}
```

That effect reacts to the cursor. There is no cursor code in it.

### The golden rule

The pointer is an orthogonal layer that crosses every effect. It is never part
of one. In [`main.frag`](packages/core/src/renderer/shaders/main.frag) the
field runs first, then the shared pointer pass is added on top:

```glsl
float v     = field(cell, u_time * u_speed);  // your effect, pointer-blind
float boost = pointerForce(px);               // the shared pass, same for all
float val   = v + boost;
```

The renderer assembles the fragment shader in a fixed order — `common → your
field() → shared pointer pass → main` — and `field()` returns before
`pointerForce()` is ever called. An effect cannot see the pointer or override
how it lands. That is the point: the interaction is calibrated once, in one
place, and every effect inherits it identically.

So a `field()` never touches `u_pointer`, `u_radius`, `u_force`, or
`pointerForce`. GLSL uniforms are global, so nothing at the language level stops
you — what stops you is a test. If you find yourself reaching for the pointer
uniforms inside a field, the effect is trying to *be* the pointer layer, and it
can't: that layer already runs, once, for everyone. The fix is to back out, not
to work around it.

This is enforced, not asked for. [`golden-rule.test.ts`](packages/core/src/__tests__/golden-rule.test.ts)
registers a brand-new effect with zero pointer code and asserts the assembled
shader still contains `float boost = pointerForce(px);` — the effect became
pointer-reactive on its own. A companion test greps every built-in's source and
fails if any pointer uniform appears in it. Read those two tests; they are the
rule in executable form.

### Two ways to ship one

**At runtime, no fork —** call `defineEffect` in your own app. This is the
whole userland story; you never touch this repo.

```ts
import { defineEffect } from '@lucasmarkes/motes'

defineEffect('rain', { glsl: `float field(vec2 cell, float t) { /* ... */ }` })
```

`defineEffect` rejects a snippet with no `field()`, so a typo fails loudly at
registration rather than rendering nothing. `removeEffect(name)` is its
counterpart, and it refuses to delete a built-in unless you pass
`{ override: true }` — the library can't be dismantled by accident.

**As a built-in — a PR.** Add it to the library so `effect="yours"` works out of
the box:

1. Add `packages/core/src/effects/<name>.glsl` (see [`flow.glsl`](packages/core/src/effects/flow.glsl) for the shape).
2. Import and register it in [`registry.ts`](packages/core/src/effects/registry.ts), beside `flow`/`waves`/`pulse`.
3. Add `'<name>'` to the `BuiltinEffect` union in [`types.ts`](packages/core/src/types.ts) so it autocompletes.
4. Add `'<name>'` to the `BUILTINS` array in `golden-rule.test.ts` — now the orthogonality assertions cover your effect too.

---

## Setup

- **Node 18+** (CI runs on 20).
- **pnpm 10.20.0**, pinned via `packageManager`. Let corepack manage it:

```sh
corepack enable
pnpm install
pnpm dev        # playground at http://localhost:5173
```

## Repo layout

| Path | What it is |
| --- | --- |
| `packages/core` | `@lucasmarkes/motes` — the renderer, the effects, the shared pointer layer. Zero runtime dependencies. |
| `packages/react` | `@lucasmarkes/motes-react` — the `<Motes />` wrapper. |
| `apps/playground` | The demo site. Not published. |
| `registry/` | shadcn-compatible copy-paste components, built into the playground. |

## Tests

```sh
pnpm test       # all three suites, 57 tests
```

- **core** (node, 30) — shader assembly, the golden rule, pointer hit-testing and smoothing, colour and charset parsing.
- **react** (jsdom, 14) — the wrapper mounts, updates on prop change, and cleans up.
- **playground** (jsdom, 13) — the launch-page logic.

A new effect ships with a test. For a built-in, adding it to the `BUILTINS`
array (step 4 above) is that test — the golden-rule suite then proves your
effect is pointer-reactive and pointer-blind for free.

## CI

Every PR and every push to `main` runs build, typecheck, the 57-test suite, and
the release gate's static checks (no unresolved `workspace:` ranges, core stays
dependency-free, shaders are inlined, versions match). It must be green to
merge.

## Pull requests

- One concern per PR. Keep it scoped.
- Describe what you verified — which effect, which browser, what you looked at —
  rather than asserting it works.

## Known CSS traps

Two failure modes that look like bugs in motes and aren't. Both come from how a
`<canvas>` participates in layout.

**The field renders as a small rectangle in the corner.** A `<canvas>` with no
CSS box falls back to its intrinsic replaced-element size — 300×150 px — and
motes renders at exactly that, ignoring the viewport. Give the canvas a real
box. For a full-bleed background that's `position: fixed; inset: 0` (the React
example uses `fixed inset-0 h-full w-full`).

**The canvas is in the DOM, sized correctly, and the page is blank.** A field
mounted behind your content with a negative z-index (`-z-10`) renders behind the
root stacking context. An opaque `background` on `html` or `body` then paints
over it, and you see nothing. Make that background transparent and move your
page background onto a content wrapper that stacks above the field.

## Releases

Maintainer-only. **Don't open a PR that bumps versions** — releases are cut by
tagging: both manifests move to the same `vX.Y.Z`, the tag is pushed, and the
protected `release` environment is approved before CI publishes with provenance.
A version bump in a contributor PR just has to be reverted.
