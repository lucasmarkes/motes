#!/usr/bin/env node
/**
 * Pre-publish gate.
 *
 * Builds, tests, packs both packages with pnpm, and inspects the resulting
 * tarballs — then STOPS and prints the publish commands. It never publishes.
 *
 * The check that matters most: npm pack leaves `"@lucasmarkes/motes":
 * "workspace:*"` in the wrapper's manifest, which no consumer can install.
 * pnpm rewrites it to a real range. That shipped silently once during Phase 5
 * testing; this is the guard.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PACKAGES = ['packages/core', 'packages/react']
const CORE = '@lucasmarkes/motes'

// CI runs this gate on every PR to catch a bad manifest edit before it ever
// reaches a tag. Those runs are unauthenticated and have no business touching
// the registry, so --static skips the two sections that reach the network:
// npm auth and the registry name check. Everything that validates the built
// tarballs — workspace: ranges, core's dependency-freedom, inlined shaders,
// matched versions — still runs.
const STATIC = process.argv.includes('--static') || process.env.MOTES_GATE_STATIC === '1'

let failures = 0
const fail = (msg) => {
  failures++
  console.error(`  ✗ ${msg}`)
}
const pass = (msg) => console.log(`  ✓ ${msg}`)
const note = (msg) => console.log(`  – ${msg}`)

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts })
}

function usingPnpm() {
  const agent = process.env.npm_config_user_agent ?? ''
  return agent.startsWith('pnpm') || agent.includes(' pnpm/')
}

console.log('\n▸ runner')
if (usingPnpm()) {
  pass('running under pnpm')
} else {
  fail(
    'not running under pnpm. Publishing with npm ships an unresolved ' +
      'workspace: protocol. Use `pnpm release`.',
  )
}

console.log('\n▸ build, typecheck, test')
try {
  run('pnpm', ['-w', 'build'], { stdio: 'pipe' })
  pass('build')
  run('pnpm', ['-w', 'typecheck'], { stdio: 'pipe' })
  pass('typecheck')
  run('pnpm', ['-w', 'test'], { stdio: 'pipe' })
  pass('tests')
} catch (err) {
  fail(`workspace checks failed:\n${err.stdout ?? err.message}`)
}

const staging = mkdtempSync(join(tmpdir(), 'motes-release-'))
const packed = []

console.log('\n▸ pack')
for (const dir of PACKAGES) {
  try {
    run('pnpm', ['pack', '--pack-destination', staging], { cwd: dir, stdio: 'pipe' })
  } catch (err) {
    fail(`pnpm pack failed in ${dir}: ${err.message}`)
  }
}
for (const file of readdirSync(staging)) {
  if (file.endsWith('.tgz')) packed.push(join(staging, file))
}
packed.length === PACKAGES.length
  ? pass(`packed ${packed.length} tarballs`)
  : fail(`expected ${PACKAGES.length} tarballs, got ${packed.length}`)

function tarballFiles(tgz) {
  return run('tar', ['-tzf', tgz]).trim().split('\n')
}
function tarballManifest(tgz) {
  return JSON.parse(run('tar', ['-xzOf', tgz, 'package/package.json']))
}

console.log('\n▸ tarball contents')
const versions = new Set()
const names = []

for (const tgz of packed) {
  const manifest = tarballManifest(tgz)
  const files = tarballFiles(tgz)
  const label = manifest.name
  versions.add(manifest.version)
  names.push(label)

  // The Phase 5 landmine.
  const unresolved = Object.entries(manifest.dependencies ?? {}).filter(
    ([, range]) => String(range).startsWith('workspace:'),
  )
  unresolved.length === 0
    ? pass(`${label}: no unresolved workspace: ranges`)
    : fail(
        `${label}: unresolved ${unresolved
          .map(([n, r]) => `${n}@${r}`)
          .join(', ')} — pack with pnpm, not npm`,
      )

  // Core must stay dependency-free.
  if (label === CORE) {
    Object.keys(manifest.dependencies ?? {}).length === 0
      ? pass(`${label}: zero runtime dependencies`)
      : fail(`${label}: expected no dependencies, found ${Object.keys(manifest.dependencies)}`)
  }

  for (const required of ['package/dist/index.js', 'package/dist/index.cjs', 'package/dist/index.d.ts']) {
    files.includes(required)
      ? pass(`${label}: ships ${required.replace('package/', '')}`)
      : fail(`${label}: missing ${required}`)
  }
  for (const meta of ['package/README.md', 'package/LICENSE']) {
    files.includes(meta)
      ? pass(`${label}: ships ${meta.replace('package/', '')}`)
      : fail(`${label}: missing ${meta.replace('package/', '')}`)
  }

  manifest.publishConfig?.access === 'public'
    ? pass(`${label}: publishConfig.access = public`)
    : fail(`${label}: publishConfig.access must be "public"`)

  // npm renders these as the source, issues and homepage links. A package
  // with no source link is the fastest way to lose someone evaluating it.
  manifest.repository?.url
    ? pass(`${label}: repository ${manifest.repository.url}`)
    : fail(`${label}: missing repository.url — npm will show no source link`)

  // Without `directory`, the source link lands on the monorepo root.
  manifest.repository?.directory
    ? pass(`${label}: repository.directory ${manifest.repository.directory}`)
    : fail(`${label}: missing repository.directory (monorepo subpath)`)

  manifest.bugs?.url
    ? pass(`${label}: bugs ${manifest.bugs.url}`)
    : fail(`${label}: missing bugs.url`)

  manifest.homepage
    ? pass(`${label}: homepage ${manifest.homepage}`)
    : fail(`${label}: missing homepage`)

  // Shaders are inlined; a consumer must not need a .glsl loader.
  if (label === CORE) {
    const bundle = run('tar', ['-xzOf', tgz, 'package/dist/index.js'])
    bundle.includes('pointerForce') && bundle.includes('gl_FragCoord')
      ? pass(`${label}: shaders inlined into the bundle`)
      : fail(`${label}: shader sources missing from the bundle`)
  }
}

console.log('\n▸ versions')
versions.size === 1
  ? pass(`both packages at ${[...versions][0]}`)
  : fail(`version mismatch across packages: ${[...versions].join(', ')}`)

console.log('\n▸ npm auth')
let whoami = null
if (STATIC) {
  note('skipped (--static): this run has no registry access')
} else {
  try {
    whoami = run('npm', ['whoami'], { stdio: 'pipe' }).trim()
    pass(`logged in as ${whoami}`)
  } catch {
    note('not logged in (run `npm login` before publishing)')
  }
}

/**
 * What a gate can and cannot prove about a package name.
 *
 * It cannot prove npm will accept it. The similarity check — the E403
 * "Package name too similar to existing package bytes" that stopped this
 * release at the irreversible step — runs on the registry when the tarball is
 * PUT, and no dry run reproduces it. Measured, all three against the real
 * registry, all three with the name that returns E403:
 *
 *   npm 10.8.2 publish --dry-run   → + motes@0.1.0
 *   npm 11     publish --dry-run   → + motes@0.1.0
 *   pnpm 10.20 publish --dry-run   → + motes@0.1.0
 *
 * `--dry-run` packs and reports; it never asks the registry anything. A 404
 * on the registry is no better — that only says nobody has claimed the name,
 * which was true of `motes` right up until npm refused it.
 *
 * What a gate can prove is that the name sits outside the check's reach. The
 * similarity check applies to unscoped names only: `bytes` and `@types/bytes`
 * both exist on npm — the identical string either side of a scope boundary.
 * So a name under a scope you can publish to cannot fail this way, and that
 * is what is checked here: scoped, scope is yours, name is free.
 *
 * Scope ownership needs `npm org ls`, not `npm access`. `npm access list
 * packages @motes` answers `@motes/md: read-write` for a scope owned by
 * someone else — it reports the package's access level, not your permission.
 */
console.log('\n▸ name')
if (STATIC) {
  note('skipped (--static): registry name check needs network + auth')
} else
for (const name of names) {
  const scope = name.startsWith('@') ? name.slice(1, name.indexOf('/')) : null

  if (!scope) {
    fail(
      `${name}: unscoped. npm's similarity check runs only at publish time — ` +
        'no dry run reproduces it, and an unclaimed name proves nothing. ' +
        'Publish under a scope you own.',
    )
  } else if (!whoami) {
    note(`${name}: scope @${scope} unverified — not logged in`)
  } else if (scope === whoami) {
    pass(`${name}: @${scope} is your own scope`)
  } else {
    let members = ''
    try {
      members = run('npm', ['org', 'ls', scope], { stdio: 'pipe' })
    } catch {
      /* not an org, or no access — handled by the membership test below */
    }
    members.split('\n').some((line) => line.trim().split(/\s+/)[0] === whoami)
      ? pass(`${name}: member of the @${scope} org`)
      : fail(
          `${name}: @${scope} is not a scope ${whoami} can publish to. ` +
            'Scopes are exclusive, and this one is unavailable or belongs to ' +
            'someone else.',
        )
  }

  try {
    const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (res.status === 404) {
      pass(`${name}: unclaimed on the registry`)
    } else if (res.ok) {
      const maintainers = (await res.json()).maintainers ?? []
      maintainers.some((m) => m.name === whoami)
        ? pass(`${name}: published, and ${whoami} is a maintainer`)
        : fail(
            `${name}: taken by ${maintainers.map((m) => m.name).join(', ') || 'someone else'}`,
          )
    } else {
      fail(`${name}: registry answered ${res.status} — could not check the name`)
    }
  } catch (err) {
    fail(`${name}: could not reach the registry (${err.message})`)
  }
}

rmSync(staging, { recursive: true, force: true })

if (failures > 0) {
  console.error(`\n✗ ${failures} check(s) failed. Not ready to publish.\n`)
  process.exit(1)
}

const version = [...versions][0]
console.log(`
✓ All checks passed. Nothing has been published.

  Publish is deliberate and manual. When you are ready:

    pnpm -C packages/core publish --access public
    pnpm -C packages/react publish --access public

  Order matters: core first, since the wrapper depends on ${CORE}@^${version}.

  Before you run those, confirm:
    · the playground is deployed and the registry URL resolves
    · README install URLs point at the deployed host
    · git tag v${version} is cut
`)
