import type { MotesOptions } from '@lucasmarkes/motes'
import { CHARSETS } from '../controls/CharsetSelect'
import { BASELINE, COLOR_KEYS, NUMERIC, NUMERIC_KEYS } from './controls'
import { decimalsOf, quantise } from './quantise'

/**
 * The four hex lengths CSS actually accepts. `{3,8}` would also wave through
 * 5 and 7, which are not colours — and a link is untrusted input.
 */
const HEX = /^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function encodeNumber(v: number, step: number): string {
  const d = decimalsOf(step)
  // parseFloat then String, so 0.30 prints as "0.3" rather than trailing a zero.
  return d ? String(parseFloat(v.toFixed(d))) : String(v)
}

/**
 * The diff from BASELINE, as readable query params.
 *
 * Readable is the requirement, not merely a preference: the URL's second job
 * is teaching the same option names the snippet panel teaches, so a tuned
 * field reads as `/flow?density=14&trail=0.3&charset=blocks`. Colours drop
 * their hash and the charset travels as its label, because the alternative is
 * a line of percent-encoded glyphs nobody can read or hand-edit.
 */
export function encode(config: MotesOptions): string {
  const p = new URLSearchParams()

  for (const key of NUMERIC_KEYS) {
    if (config[key] === BASELINE[key]) continue
    p.set(key, encodeNumber(config[key], NUMERIC[key].step))
  }

  if (config.pointer !== BASELINE.pointer) p.set('pointer', config.pointer ? '1' : '0')

  if (config.charset !== BASELINE.charset) {
    const known = CHARSETS.find((c) => c.value === config.charset)
    // A charset outside the catalogue is omitted rather than mangled; the
    // receiving end then keeps its own baseline ramp.
    if (known) p.set('charset', known.label)
  }

  for (const key of COLOR_KEYS) {
    const v = config[key]
    if (v === BASELINE[key]) continue
    p.set(key, v === 'transparent' ? 'transparent' : v.replace(/^#/, ''))
  }

  return p.toString()
}

/**
 * A link is untrusted input. Every branch below either yields a legal value or
 * drops the key — nothing throws, and a hostile URL renders the baseline
 * field rather than a blank page.
 */
export function decode(search: string): Partial<MotesOptions> {
  const p = new URLSearchParams(search.replace(/^\?/, ''))
  const out: Partial<MotesOptions> = {}

  for (const key of NUMERIC_KEYS) {
    const raw = p.get(key)
    if (raw === null || raw.trim() === '') continue
    const n = Number(raw)
    // Number('') is 0 and Number('Infinity') is not a value any control can
    // hold; both are rejected rather than clamped into something that looks
    // deliberate.
    if (!Number.isFinite(n)) continue
    const c = NUMERIC[key]
    out[key] = quantise(n, c.min, c.max, c.step)
  }

  const pointer = p.get('pointer')
  if (pointer === '0') out.pointer = false
  else if (pointer === '1') out.pointer = true

  const charset = p.get('charset')
  if (charset !== null) {
    const known = CHARSETS.find((c) => c.label === charset)
    if (known) out.charset = known.value
  }

  for (const key of COLOR_KEYS) {
    const raw = p.get(key)
    if (raw === null) continue
    if (raw === 'transparent') out[key] = 'transparent'
    else if (HEX.test(raw)) out[key] = `#${raw.toLowerCase()}`
  }

  return out
}
