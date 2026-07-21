# motes registry

A [shadcn](https://ui.shadcn.com/docs/registry)-compatible registry of drop-in
background components. Copy-paste distribution, alongside the npm packages.

## Items

| Item | What you get |
| --- | --- |
| `motes-background` | The base component: a full-viewport field pinned behind your content. |
| `motes-flow-background` | Warm drifting noise, tuned. |
| `motes-waves-background` | Wide interfering bands, slower and cooler. |
| `motes-pulse-background` | Dense radial rings with long persistence. |

The three presets declare `motes-background` as a registry dependency, so
installing one pulls the base component with it.

## Install

```sh
npx shadcn@latest add <registry-url>/r/motes-flow-background.json
```

Then render it once, near the root of your app:

```tsx
import { MotesFlowBackground } from '@/components/motes-flow-background'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MotesFlowBackground />
      {children}
    </>
  )
}
```

The base component takes every motes option, so you can skip the presets:

```tsx
import { MotesBackground } from '@/components/motes-background'

<MotesBackground effect="pulse" pointer radius={200} accent="#3f8ea7" />
```

The canvas carries `pointer-events: none`, so it never swallows a click — and
the field still reacts as the cursor crosses your content, because motes reads
the pointer from the window and hit-tests the canvas box.

## Building the registry

Every file under `apps/playground/public/r/` is generated. Do not hand-edit
them; edit `registry/src/*.tsx` and the item list in `registry/build.mjs`.

```sh
MOTES_REGISTRY_URL=https://your-host node registry/build.mjs
```

`shadcn add` needs an absolute URL to fetch an item, and a preset's reference
to the base component has to be absolute too. That hostname is injected from
`MOTES_REGISTRY_URL` at build time so it never appears in source. Without the
variable the build falls back to `http://localhost:5173` and warns.

The playground's `build` script runs the generator first, so deploying the
playground publishes the registry with it.
