import {
  DEFAULT_CONFIG,
  DEFAULT_LOOK,
  DEFAULT_NAME,
  sanitizeName,
  type Flow,
  type LabConfig,
  type Look,
  type Mask,
  type Pattern,
  type StageConfig,
} from './pipeline'

/**
 * A composition as a query string, so a Lab session is a link.
 *
 * The field is written out in full — a shared link reconstructs it without
 * depending on whatever preset the app happens to default to. The look is
 * mostly the defaults, so only what was changed rides along, which keeps the
 * common link short. Decoding is defensive by design: a truncated or tampered
 * URL falls back per field rather than throwing, so a bad link degrades to a
 * sensible field instead of a blank page.
 */

const PATTERNS: readonly Pattern[] = ['fbm', 'bands', 'lanes', 'rings']
const FLOWS: readonly Flow[] = ['up', 'down', 'still']
const MASKS: readonly Mask[] = ['bottom', 'top', 'center', 'none']

const HEX = /^#[0-9a-fA-F]{6}$/

export function encodeConfig(config: LabConfig): string {
  const p = new URLSearchParams()
  const { stage, look, name } = config

  p.set('turbulence', String(stage.turbulence))
  p.set('pattern', stage.pattern)
  p.set('flow', stage.flow)
  p.set('speed', String(stage.speed))
  p.set('mask', stage.mask)
  p.set('falloff', String(stage.falloff))
  p.set('contrast', String(stage.contrast))
  p.set('flicker', stage.flicker ? '1' : '0')

  if (look.pointer !== DEFAULT_LOOK.pointer) p.set('pointer', look.pointer ? '1' : '0')
  if (look.radius !== DEFAULT_LOOK.radius) p.set('radius', String(look.radius))
  if (look.force !== DEFAULT_LOOK.force) p.set('force', String(look.force))
  if (look.density !== DEFAULT_LOOK.density) p.set('density', String(look.density))
  if (look.trail !== DEFAULT_LOOK.trail) p.set('trail', String(look.trail))
  if (look.charset !== DEFAULT_LOOK.charset) p.set('charset', look.charset)
  if (look.accent !== DEFAULT_LOOK.accent) p.set('accent', look.accent)

  if (name !== DEFAULT_NAME) p.set('name', name)

  return p.toString()
}

export function decodeConfig(search: string): LabConfig {
  const p = new URLSearchParams(search.replace(/^\?/, ''))
  const d = DEFAULT_CONFIG

  const stage: StageConfig = {
    turbulence: numOf(p, 'turbulence', d.stage.turbulence),
    pattern: enumOf(p, 'pattern', PATTERNS, d.stage.pattern),
    flow: enumOf(p, 'flow', FLOWS, d.stage.flow),
    speed: numOf(p, 'speed', d.stage.speed),
    mask: enumOf(p, 'mask', MASKS, d.stage.mask),
    falloff: numOf(p, 'falloff', d.stage.falloff),
    contrast: numOf(p, 'contrast', d.stage.contrast),
    flicker: boolOf(p, 'flicker', d.stage.flicker),
  }

  const look: Look = {
    ...DEFAULT_LOOK,
    pointer: boolOf(p, 'pointer', DEFAULT_LOOK.pointer),
    radius: numOf(p, 'radius', DEFAULT_LOOK.radius),
    force: numOf(p, 'force', DEFAULT_LOOK.force),
    density: numOf(p, 'density', DEFAULT_LOOK.density),
    trail: numOf(p, 'trail', DEFAULT_LOOK.trail),
    charset: strOf(p, 'charset', DEFAULT_LOOK.charset),
    accent: hexOf(p, 'accent', DEFAULT_LOOK.accent),
  }

  const name = sanitizeName(p.get('name') ?? DEFAULT_NAME)

  return { name, stage, look }
}

/** Finite number or the fallback. An empty value counts as absent — otherwise
 *  `Number('')` is 0, and a truncated `&falloff=` would read as zero. */
function numOf(p: URLSearchParams, key: string, fallback: number): number {
  const raw = p.get(key)
  if (raw === null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function enumOf<T extends string>(
  p: URLSearchParams,
  key: string,
  valid: readonly T[],
  fallback: T,
): T {
  const raw = p.get(key)
  return raw !== null && (valid as readonly string[]).includes(raw) ? (raw as T) : fallback
}

function boolOf(p: URLSearchParams, key: string, fallback: boolean): boolean {
  const raw = p.get(key)
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

function strOf(p: URLSearchParams, key: string, fallback: string): string {
  const raw = p.get(key)
  return raw ? raw : fallback
}

function hexOf(p: URLSearchParams, key: string, fallback: string): string {
  const raw = p.get(key)
  return raw && HEX.test(raw) ? raw : fallback
}
