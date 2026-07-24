import type { Flow, Mask, Pattern, StageConfig } from './pipeline'

/**
 * Generate the GLSL `field()` function for a pipeline config.
 *
 * Numeric params are baked in as literals. The output is meant to be read: real
 * indentation, a comment naming the stages, and — by construction — not one
 * mention of the cursor. The pointer layer is the renderer's job, applied after
 * `field()` returns, identically for every effect.
 *
 * The available environment (from the library's common.glsl) is: the uniforms
 * `u_grid` (cols, rows) and `u_time`, and the helpers `hash21`, `valueNoise`,
 * and `fbm`. A field must return roughly 0..1.
 */

/**
 * Turbulence gain: the slider value scales the domain-warp displacement by this.
 * At the slider's top (3.0) the warp is (warp - 0.5) * 6.0 — ±3 cells at the
 * tip, which is as far as the structure survives. The old ×4 ran to ±8 cells at
 * the top, past the point where a flame reads as anything but mush; the source
 * term below then only spared the base, not the whole range. Both had to move.
 */
const TURBULENCE_GAIN = 2

export function generateField(config: StageConfig): string {
  const { turbulence, pattern, flow, speed, mask, falloff, contrast, flicker } = config
  const hasFlow = flow !== 'still'
  const hasTurbulence = turbulence > 0
  const hasMask = mask !== 'none'
  // The source term is only computed once, up front, and only when both the
  // warp and the mask want it — the warp to fall off toward the source, the
  // mask to build toward it. When just the mask needs it, it stays inline there.
  const sharesSource = hasTurbulence && hasMask

  const lines: string[] = []
  const emit = (line = '') => lines.push(line)

  emit('float field(vec2 cell, float t) {')
  emit(`  // stages: ${summarize(config)}`)
  emit('  // Nothing below mentions the cursor. The pointer layer is added after')
  emit('  // field() returns, the same for every effect — you compose only the field.')
  emit('')
  emit('  vec2 p = cell;')

  if (sharesSource) {
    // One value, two readers. `src` is 1 at the mask's source edge and 0 far
    // from it: the mask builds the field toward it (pow below), and turbulence
    // reads it inverted, so the warp is calm at the source and free at the tip.
    // A flame is laminar where it is fed and chaotic where it lets go; the same
    // shape gives the aurora a still top edge and the pulse a clean centre.
    emit('')
    emit(`  // SOURCE — ${mask}: 1 at the source, 0 away from it`)
    emit(`  float src = ${sourceExpr(mask)};`)
  }

  if (hasFlow) {
    // Flow is a temporal phase, not a coordinate shift: up scrolls the phase
    // forward, down scrolls it back. The pattern folds it into its own argument.
    const rate = flow === 'up' ? `t * ${f(speed)}` : `-t * ${f(speed)}`
    emit('')
    emit(`  // FLOW — ${flow} at ${f(speed)}`)
    emit(`  float flow = ${rate};`)
  }

  if (hasTurbulence) {
    // Domain warp: push the sampling coordinate around with low-frequency noise
    // before the pattern reads it. This is what turns flat noise into something
    // that curls and licks.
    emit('')
    emit(`  // TURBULENCE — domain warp, amount ${f(turbulence)}${sharesSource ? ', laminar at the source' : ''}`)
    // Both components carry a time term, on different axes and rates, so the
    // warp scrolls in x as well as y. A frozen x-warp is why noise sits still
    // instead of licking side to side.
    emit('  vec2 warp = vec2(')
    emit('    fbm(p * 0.03 + vec2(t * 0.15, 11.0)),')
    emit('    fbm(p * 0.03 + vec2(4.0, t * 0.13))')
    emit('  );')
    // Weighted by (1 - src) where there's a source: zero displacement at the
    // source edge, full displacement far from it. Without a mask there is no
    // source, so the warp is uniform.
    const amount = f(turbulence * TURBULENCE_GAIN)
    emit(`  p += (warp - 0.5) * ${amount}${sharesSource ? ' * (1.0 - src)' : ''};`)
  }

  emit('')
  emit(`  // PATTERN — ${pattern}`)
  for (const line of patternLines(pattern, hasFlow)) emit(`  ${line}`)

  if (hasMask) {
    // The mask anchors the field to an edge with an exponential falloff. It is
    // what makes a source: without it, noise is uniform and never reads as
    // flame, aurora, or a pulse — just a moving texture.
    emit('')
    emit(`  // MASK — ${mask}, falloff ${f(falloff)}`)
    for (const line of maskLines(mask, falloff, sharesSource)) emit(`  ${line}`)
  }

  emit('')
  emit(`  // SHAPE — contrast ${f(contrast)}${flicker ? ' + flicker' : ''}`)
  emit(`  v = pow(clamp(v, 0.0, 1.0), ${f(contrast)});`)
  if (flicker) {
    emit('  v *= 0.6 + 0.4 * valueNoise(vec2(cell.x * 0.30, t * 2.5));')
  }

  emit('')
  emit('  return v;')
  emit('}')

  return lines.join('\n')
}

/** The four patterns, each writing a `float v`. `flow` exists iff `hasFlow`. */
function patternLines(pattern: Pattern, hasFlow: boolean): string[] {
  switch (pattern) {
    case 'fbm': {
      if (hasFlow) {
        // Anisotropic while flowing: a higher x frequency and a lower y one
        // stretch the noise along the flow axis, so it reads as rising streaks
        // rather than the round blobs an isotropic sample gives. Isotropic when
        // still, where there is no axis to stretch along.
        return ['float v = fbm(vec2(p.x * 0.11, p.y * 0.06 + flow * 0.12));']
      }
      return ['float v = fbm(vec2(p.x * 0.08, p.y * 0.08));']
    }
    case 'bands': {
      const phase = hasFlow ? ' + flow * 0.8' : ''
      return [`float v = 0.5 + 0.5 * sin(p.y * 0.25${phase} + fbm(p * 0.05) * 2.0);`]
    }
    case 'lanes': {
      // Lane identity comes from the original column, so lanes stay vertical
      // even when turbulence warps everything else.
      const phase = hasFlow ? ' + flow * 0.5' : ''
      return [
        'float lane = fract(sin(cell.x * 91.7) * 4321.0);',
        `float drop = fract(p.y * 0.05${phase} + lane * 7.0);`,
        'float v = smoothstep(0.0, 0.05, drop) * pow(1.0 - drop, 5.0) * (0.55 + lane * 0.45);',
      ]
    }
    case 'rings': {
      const phase = hasFlow ? ' + flow * 0.4' : ''
      return [
        'vec2 d = p - u_grid * 0.5;',
        `float v = 0.5 + 0.5 * sin(length(d) * 0.4 - t * 1.6${phase});`,
      ]
    }
  }
}

/**
 * The source coordinate for a mask: 1 at the source edge, 0 far from it. The
 * mask raises it to the falloff power for strength; turbulence uses (1 - it).
 */
function sourceExpr(mask: Exclude<Mask, 'none'>): string {
  switch (mask) {
    case 'bottom':
      return 'clamp(cell.y / u_grid.y, 0.0, 1.0)'
    case 'top':
      return 'clamp(1.0 - cell.y / u_grid.y, 0.0, 1.0)'
    case 'center':
      // Distance normalized by half-height, so the source stays a circle on any
      // aspect instead of stretching into an ellipse. On a wide viewport that
      // leaves the sides dark — deliberate: a pulse is round.
      return 'clamp(1.0 - length(cell - u_grid * 0.5) / (u_grid.y * 0.5), 0.0, 1.0)'
  }
}

/**
 * The mask multiplies `v` by an edge-anchored falloff. When turbulence already
 * computed `src` up front, reuse it; otherwise inline the source coordinate.
 */
function maskLines(mask: Exclude<Mask, 'none'>, falloff: number, hasSrc: boolean): string[] {
  const src = hasSrc ? 'src' : sourceExpr(mask)
  return [`float m = pow(${src}, ${f(falloff)});`, 'v *= m;']
}

/** A one-line, human-legible summary of the active stages. */
function summarize(config: StageConfig): string {
  const parts: string[] = []
  if (config.turbulence > 0) parts.push(`turbulence ${f(config.turbulence)}`)
  parts.push(config.pattern)
  parts.push(flowLabel(config.flow, config.speed))
  parts.push(config.mask === 'none' ? 'no mask' : `mask ${config.mask} ${f(config.falloff)}`)
  parts.push(`contrast ${f(config.contrast)}${config.flicker ? ', flicker' : ''}`)
  return parts.join(' -> ')
}

function flowLabel(flow: Flow, speed: number): string {
  return flow === 'still' ? 'still' : `flow ${flow} ${f(speed)}`
}

/** Render a number as a GLSL float literal — always with a decimal point. */
function f(n: number): string {
  const r = Math.round(n * 1e4) / 1e4
  return Number.isInteger(r) ? r.toFixed(1) : String(r)
}
