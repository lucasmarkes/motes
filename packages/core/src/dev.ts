// The diagnostics gate reads process.env.NODE_ENV as a bare literal so a
// consumer's bundler can substitute and dead-code-eliminate it. TypeScript
// needs to believe `process` exists; the runtime guard below handles the case
// where it does not.
declare const process: { env: Record<string, string | undefined> }

/**
 * True in development, false in production. A bundler replaces the literal
 * `process.env.NODE_ENV` → `"production" !== "production"` → `false`, and every
 * diagnostic path behind this flag is eliminated from production builds. But
 * `process` is undefined in raw browser ESM — a CDN `<script type="module">`
 * user — where touching it throws a ReferenceError, fatal for a zero-dependency
 * browser library. The read is wrapped so that user still gets help. Writing
 * `process.env?.NODE_ENV` instead would defeat the bundler substitution, which
 * matches the exact literal. Evaluated once, at module load.
 *
 * Shared by the renderer's install diagnostics and the effect registry's
 * redefinition warnings, so the substitution contract lives in exactly one
 * place and the two cannot drift.
 */
export const NOISY: boolean = (() => {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return true
  }
})()
