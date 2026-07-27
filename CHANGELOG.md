# Changelog

`@lucasmarkes/motes` and `@lucasmarkes/motes-react` move in lockstep — every
release tags both at the same version. Dates are the tag date.

## 0.2.0 — unreleased

New public API on core, so this is a minor, not a patch. **Accumulating until
the cut** — the pipeline Lab (`apps/playground`) is not published, but the
core-surface change it drove is.

### Added

- **`removeEffect(name, options?)`** — the counterpart to `defineEffect`.
  Returns whether the name was registered; a no-op for an unknown name. It
  refuses to delete a built-in (`flow`, `waves`, `pulse`) unless you pass
  `{ override: true }`, so the library can't be dismantled at runtime by
  accident. It frees no GPU resources: the compiled program is owned by the
  renderer and released when the effect is swapped out or the instance is
  destroyed, not here.

### Changed

- **`defineEffect` now guards the two name collisions that used to pass
  silently.** Redefining a built-in (`flow`, `waves`, `pulse`) throws unless you
  pass `{ override: true }` — the same protection `removeEffect` gives them,
  since either one swaps the field out from under every consumer asking for it
  by name. Redefining one of *your own* names with a *changed* definition warns
  once in development (probably an accidental collision) but still applies —
  advisory, not a veto. Re-registering an identical definition stays silent, so
  StrictMode and HMR re-runs cost nothing. A missing name or a snippet without a
  `float field(vec2 cell, float t)` throws, as before. All warnings compile out
  of production.

## 0.1.3 — 2026-07-23

### Added

- **Development diagnostics for the two CSS traps** — a canvas that renders
  tiny in a corner (intrinsic 300×150 size), and a page that stays blank behind
  a negative z-index (an opaque `<body>` background painting over it). Each is
  detected in development and prints a one-time console warning with the exact
  fix; both compile out of production. Silence a deliberate layout with
  `<canvas data-motes-quiet>`.
