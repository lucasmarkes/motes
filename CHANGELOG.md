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

<!--
  Phase 5 (defineEffect hardening — throw-on-builtin with { override: true },
  dev-warn on overwrite, HMR warn-only-on-diff) lands in this same 0.2.0 and
  should be added above before the tag is cut.
-->

## 0.1.3 — 2026-07-23

### Added

- **Development diagnostics for the two CSS traps** — a canvas that renders
  tiny in a corner (intrinsic 300×150 size), and a page that stays blank behind
  a negative z-index (an opaque `<body>` background painting over it). Each is
  detected in development and prints a one-time console warning with the exact
  fix; both compile out of production. Silence a deliberate layout with
  `<canvas data-motes-quiet>`.
