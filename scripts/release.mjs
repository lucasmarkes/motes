#!/usr/bin/env node
/**
 * Pre-publish gate.
 *
 * Builds, tests, packs both packages with pnpm, and inspects the resulting
 * tarballs — then STOPS and prints the publish commands. It never publishes.
 *
 * The check that matters most: npm pack leaves `"motes": "workspace:*"` in
 * @motes/react's manifest, which no consumer can install. pnpm rewrites it to
 * a real range. That shipped silently once during Phase 5 testing; this is
 * the guard.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PACKAGES = ['packages/core', 'packages/react']

let failures = 0
const fail = (msg) => {
  failures++
  console.error(`  ✗ ${msg}`)
}
const pass = (msg) => console.log(`  ✓ ${msg}`)

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

for (const tgz of packed) {
  const manifest = tarballManifest(tgz)
  const files = tarballFiles(tgz)
  const label = manifest.name
  versions.add(manifest.version)

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
  if (label === 'motes') {
    Object.keys(manifest.dependencies ?? {}).length === 0
      ? pass('motes: zero runtime dependencies')
      : fail(`motes: expected no dependencies, found ${Object.keys(manifest.dependencies)}`)
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

  // Shaders are inlined; a consumer must not need a .glsl loader.
  if (label === 'motes') {
    const bundle = run('tar', ['-xzOf', tgz, 'package/dist/index.js'])
    bundle.includes('pointerForce') && bundle.includes('gl_FragCoord')
      ? pass('motes: shaders inlined into the bundle')
      : fail('motes: shader sources missing from the bundle')
  }
}

console.log('\n▸ versions')
versions.size === 1
  ? pass(`both packages at ${[...versions][0]}`)
  : fail(`version mismatch across packages: ${[...versions].join(', ')}`)

console.log('\n▸ npm auth')
try {
  const who = run('npm', ['whoami'], { stdio: 'pipe' }).trim()
  pass(`logged in as ${who}`)
} catch {
  console.log('  – not logged in (run `npm login` before publishing)')
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

  Order matters: core first, since @motes/react depends on motes@^${version}.

  Before you run those, confirm:
    · the playground is deployed and the registry URL resolves
    · README install URLs point at the deployed host
    · git tag v${version} is cut
`)
