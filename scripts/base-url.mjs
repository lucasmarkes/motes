/**
 * Where this build thinks it lives.
 *
 * Two things need an absolute URL in their output and neither may contain one
 * in its source: the shadcn registry, whose items must reference each other by
 * URL, and the OG tags, which crawlers will not resolve relatively. Both ask
 * here rather than naming a host, so localhost, a preview and production
 * differ only by environment.
 *
 * The ladder is ordered by how specific the answer is. An explicit override
 * wins; production names itself; anything else on Vercel is a preview and
 * self-references, which is what makes a preview testable — its registry items
 * install from that preview, and its card shows that preview's image.
 */

const FALLBACK = 'http://localhost:5173'

export function resolveBase() {
  const explicit = process.env.MOTES_REGISTRY_URL?.trim()
  if (explicit) return { url: explicit, source: 'MOTES_REGISTRY_URL' }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (process.env.VERCEL_ENV === 'production' && productionHost) {
    return { url: `https://${productionHost}`, source: 'VERCEL_PROJECT_PRODUCTION_URL' }
  }

  const deploymentHost = process.env.VERCEL_URL?.trim()
  if (deploymentHost) {
    return { url: `https://${deploymentHost}`, source: 'VERCEL_URL' }
  }

  return { url: FALLBACK, source: 'fallback' }
}

/** The same answer, trailing slashes stripped, ready to concatenate onto. */
export function resolveBaseUrl() {
  return resolveBase().url.replace(/\/+$/, '')
}

export { FALLBACK }
