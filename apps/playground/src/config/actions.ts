import type { MotesOptions } from '@lucasmarkes/motes'
import { CHARSETS } from '../controls/CharsetSelect'
import { PRESETS } from '../presets'
import { BASELINE, NUMERIC, NUMERIC_KEYS, SECTION_KEYS, type Section } from './controls'
import { quantise } from './quantise'

/** Baseline everywhere, except the effect — resetting must not navigate. */
export function resetAll(current: MotesOptions): MotesOptions {
  return { ...BASELINE, effect: current.effect }
}

export function resetSection(current: MotesOptions, section: Section): MotesOptions {
  const next = { ...current }
  for (const key of SECTION_KEYS[section]) {
    // Assigning key-by-key from BASELINE keeps each property's own type; a
    // spread of a picked subset would widen them all to string | number.
    Object.assign(next, { [key]: BASELINE[key] })
  }
  return next
}

export function isSectionDirty(config: MotesOptions, section: Section): boolean {
  return SECTION_KEYS[section].some((key) => config[key] !== BASELINE[key])
}

function pick<T>(items: readonly T[], rand: () => number): T | undefined {
  if (items.length === 0) return undefined
  // Math.min guards a rand() that returns exactly 1, which would index past
  // the end. noUncheckedIndexedAccess still makes the result optional.
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))]
}

/**
 * A roll you would ship.
 *
 * Colour comes from a whole preset rather than three random hex values,
 * because random background/ink pairs are frequently illegible and a demo
 * that can randomize itself into mud is arguing against the library. The
 * pointer is pinned on for the same reason: pointer-off is the "before" half
 * of the pitch, and rolling into it would hide what the page exists to show.
 */
export function randomize(
  current: MotesOptions,
  rand: () => number = Math.random,
): MotesOptions {
  const next: MotesOptions = { ...current, pointer: true }

  for (const key of NUMERIC_KEYS) {
    const c = NUMERIC[key]
    next[key] = quantise(c.min + rand() * (c.max - c.min), c.min, c.max, c.step)
  }

  const charset = pick(CHARSETS, rand)
  if (charset) next.charset = charset.value

  const preset = pick(PRESETS, rand)
  if (preset) Object.assign(next, preset.values)

  return next
}
