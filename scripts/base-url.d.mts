/**
 * Hand-written because `vite.config.ts` imports this and is typechecked with
 * `allowJs` off. Keep in step with base-url.mjs.
 */
export interface ResolvedBase {
  url: string
  source: 'MOTES_REGISTRY_URL' | 'VERCEL_PROJECT_PRODUCTION_URL' | 'VERCEL_URL' | 'fallback'
}

export declare function resolveBase(): ResolvedBase
export declare function resolveBaseUrl(): string
export declare const FALLBACK: string
