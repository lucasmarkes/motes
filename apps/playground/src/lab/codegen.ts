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
export function generateField(config: StageConfig): string {
  const { turbulence, pattern, flow, speed, mask, falloff, contrast, flicker } = config
  const hasFlow = flow !== 'still'

  const lines: string[] = []
  const emit = (line = '') => lines.push(line)

  emit('float field(vec2 cell, float t) {')
  emit(`  // stages: ${summarize(config)}`)
  emit('  // Nothing below mentions the cursor. The pointer layer is added after')
  emit('  // field() returns, the same for every effect — you compose only the field.')
  emit('')
  emit('  vec2 p = cell;')

  if (hasFlow) {
    // Flow is a temporal phase, not a coordinate shift: up scrolls the phase
    // forward, down scrolls it back. The pattern folds it into its own argument.
    const rate = flow === 'up' ? `t * ${f(speed)}` : `-t * ${f(speed)}`
    emit('')
    emit(`  // FLOW — ${flow} at ${f(speed)}`)
    emit(`  float flow = ${rate};`)
  }

  if (turbulence > 0) {
    // Domain warp: push the sampling coordinate around with low-frequency noise
    // before the pattern reads it. This is what turns flat noise into something
    // that curls and licks.
    emit('')
    emit(`  // TURBULENCE — domain warp, amount ${f(turbulence)}`)
    // Both components carry a time term, on different axes and rates, so the
    // warp scrolls in x as well as y. A frozen x-warp is why noise sits still
    // instead of licking side to side.
    emit('  vec2 warp = vec2(')
    emit('    fbm(p * 0.03 + vec2(t * 0.15, 11.0)),')
    emit('    fbm(p * 0.03 + vec2(4.0, t * 0.13))')
    emit('  );')
    emit(`  p += (warp - 0.5) * ${f(turbulence * 4)};`)
  }

  emit('')
  emit(`  // PATTERN — ${pattern}`)
  for (const line of patternLines(pattern, hasFlow)) emit(`  ${line}`)

  if (mask !== 'none') {
    // The mask anchors the field to an edge with an exponential falloff. It is
    // what makes a source: without it, noise is uniform and never reads as
    // flame, aurora, or a pulse — just a moving texture.
    emit('')
    emit(`  // MASK — ${mask}, falloff ${f(falloff)}`)
    for (const line of maskLines(mask, falloff)) emit(`  ${line}`)
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
      const y = hasFlow ? 'p.y * 0.08 + flow * 0.12' : 'p.y * 0.08'
      return [`float v = fbm(vec2(p.x * 0.08, ${y}));`]
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

/** The four masks, each multiplying `v` by an edge-anchored falloff. */
function maskLines(mask: Exclude<Mask, 'none'>, falloff: number): string[] {
  const p = f(falloff)
  switch (mask) {
    case 'bottom':
      return [`float m = pow(clamp(cell.y / u_grid.y, 0.0, 1.0), ${p});`, 'v *= m;']
    case 'top':
      return [`float m = pow(clamp(1.0 - cell.y / u_grid.y, 0.0, 1.0), ${p});`, 'v *= m;']
    case 'center':
      return [
        // Distance is normalized by half-height, so the source stays a circle on
        // any aspect instead of stretching into an ellipse. On a wide viewport
        // that leaves the sides dark — deliberate: a pulse is round.
        `float m = pow(clamp(1.0 - length(cell - u_grid * 0.5) / (u_grid.y * 0.5), 0.0, 1.0), ${p});`,
        'v *= m;',
      ]
  }
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
