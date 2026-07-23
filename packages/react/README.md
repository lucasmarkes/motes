![A field of ASCII characters rippling around a moving cursor](https://raw.githubusercontent.com/lucasmarkes/motes/main/assets/hero.gif)

# @lucasmarkes/motes-react

React wrapper for [motes](https://www.npmjs.com/package/@lucasmarkes/motes) — procedural,
pointer-reactive ASCII backgrounds for the web.

**[Try it with your own cursor →](https://motes.lucasmarkes.com)**

```sh
npm i @lucasmarkes/motes-react
```

## Usage

```tsx
import { Motes } from '@lucasmarkes/motes-react'

export function Background() {
  return (
    <Motes
      effect="flow"
      pointer
      className="fixed inset-0 -z-10 h-full w-full pointer-events-none"
    />
  )
}
```

Every [motes option](https://www.npmjs.com/package/@lucasmarkes/motes) is a prop: `effect`,
`pointer`, `radius`, `force`, `speed`, `density`, `charset`, `accent`, `trail`.

## Behaviour

The component holds no state. Changing a prop diffs down to the keys that
actually changed and updates uniforms directly, so the field never re-renders
your tree. Unknown props — `className`, `style`, `aria-*`, `id`, event handlers
— forward to the canvas.

Sizing comes from CSS. Give the canvas a box and the field follows it, across
resizes and monitor-to-monitor DPI changes.

Give it a real box, though. `<canvas>` is a replaced element with an intrinsic
300×150 size, so pinning alone — `fixed inset-0`, `absolute inset-0` — leaves it
at 300×150 in the corner: with `width: auto` the inset equation is
over-constrained and the size wins. Add `h-full w-full` (or `width: 100%;
height: 100%`) and it fills the box you pinned it to.

The field reads the pointer from `window` and hit-tests the canvas box, so
`pointer-events: none` keeps clicks flowing to whatever sits on top without
costing you any reactivity.

## Troubleshooting

Two CSS traps turn a working renderer into a blank page. In development the
field detects each and prints a one-time console warning with the exact fix.

- **Field is tiny in a corner.** Pinning alone does not stretch a `<canvas>`
  past its intrinsic 300×150 — add `h-full w-full` (see *Behaviour* above).
- **Field draws but nothing shows, behind `-z-10`.** When `<html>` and `<body>`
  both carry a background colour, `<body>`'s stops propagating to the viewport
  and paints above a negative z-index. Keep the background on exactly one of
  them, or drop the negative z-index.

Both warnings are development-only and compile out of production builds. If the
layout is deliberate, pass `data-motes-quiet` — the component forwards it to the
canvas: `<Motes data-motes-quiet … />`.

There is one occlusion case the field does **not** warn about: an `absolute`
negative-z field nested in a positioned parent that has its own opaque
background and does not establish a stacking context — the parent paints over
it. The `fixed inset-0` snippet at the top is immune. If you must nest under
`absolute`, give the parent `isolation: isolate` or move its background.
Detecting it would mean reimplementing the CSS stacking-context algorithm, whose
wrong answer is a false positive.

## Ref

```tsx
import { useRef } from 'react'
import { Motes } from '@lucasmarkes/motes-react'
import type { MotesInstance } from '@lucasmarkes/motes'

const field = useRef<MotesInstance>(null)

<Motes ref={field} effect="pulse" />

field.current?.stop()
field.current?.set({ trail: 0.8 })
```

The handle is stable and never null once mounted.

## Notes

Requires React 18 or newer, and a browser with WebGL2.

MIT.
