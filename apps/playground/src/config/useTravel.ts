import { useCallback, useEffect, useRef, useState } from 'react'
import type { MotesOptions } from '@lucasmarkes/motes'
import { blend, ease, isMoving } from './travel'

/**
 * Long enough to read as a journey, short enough that Randomize still feels
 * like a button rather than a cutscene. Rolling repeatedly is how anyone
 * finds a field they like, and every extra hundred milliseconds is paid on
 * every roll.
 */
export const TRAVEL_MS = 320

/** Whether the reader has asked the interface to hold still. Read at the
 *  moment of use rather than cached, because the setting can change under a
 *  page that is already open. */
function stillness(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Reset and randomize, shown as travel rather than as a cut.
 *
 * Wraps the config's own `replace` and drives it once per frame, so nothing
 * downstream needs to know this is happening: the sliders, the URL and the
 * field all keep taking a whole config and drawing it. The debounce inside
 * useConfig already collapses the frames into a single URL write.
 *
 * `arrivals` counts journeys that have ended, which is what the panel's
 * staggered rise waits for — it is a counter rather than a flag because two
 * rolls in a row must read as two arrivals, and a boolean flipping true twice
 * reads as one.
 */
export function useTravel(
  config: MotesOptions,
  replace: (next: MotesOptions, url?: MotesOptions) => void,
  preview: (next: MotesOptions) => void,
) {
  const frame = useRef<number | null>(null)
  const [arrivals, setArrivals] = useState(0)

  // A mirror of the current config, so `travel` can read where the field is
  // now without being rebuilt on every frame of its own animation.
  const latest = useRef(config)
  latest.current = config

  const cancel = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [])

  const land = useCallback(
    (to: MotesOptions, paintOnly: boolean) => {
      frame.current = null
      // The destination object itself, never blend(from, to, 1). A journey
      // that ends a hundredth short of its target would leave the panel
      // permanently dirty after a Reset, and the section resets and the clean
      // URL both key off exact equality with the baseline.
      if (paintOnly) preview(to)
      else replace(to)
      setArrivals((n) => n + 1)
    },
    [preview, replace],
  )

  const travel = useCallback(
    (to: MotesOptions) => {
      cancel()
      const from = latest.current
      if (stillness() || !isMoving(from, to)) {
        land(to, false)
        return
      }
      // Where we are going, said once and now. The frames after this only
      // paint; see the note on `preview`.
      replace(from, to)
      const start = performance.now()
      const step = (now: number) => {
        const t = (now - start) / TRAVEL_MS
        if (t >= 1) {
          land(to, true)
          return
        }
        preview(blend(from, to, ease(t)))
        frame.current = requestAnimationFrame(step)
      }
      // Starting on the next frame rather than painting one here: the first
      // frame of an ease-out barely moves, and drawing it synchronously only
      // costs a render.
      frame.current = requestAnimationFrame(step)
    },
    [cancel, land, preview, replace],
  )

  useEffect(() => cancel, [cancel])

  return { travel, arrivals }
}
