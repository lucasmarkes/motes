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
to the base component has to be absolute too. That hostname never appears in
source; it is resolved from the environment, in order:

| Source | When |
| --- | --- |
| `MOTES_REGISTRY_URL` | Always wins, if set. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Production deployments. |
| `VERCEL_URL` | Preview deployments — items self-reference that preview, so `shadcn add` is testable before production. |
| `http://localhost:5173` | Local. Warns. |

A deployed build that prints the localhost warning has published items nobody
can install. Treat that line in the build log as a failed deploy.

All four variables are declared in `turbo.json` under the `build` task.
Turborepo does not forward undeclared environment variables to tasks, so an
undeclared one is silently absent and the build falls back to localhost.

The playground's `build` script runs the generator first, so deploying the
playground publishes the registry with it.
