import { useCallback, useEffect, useRef, useState } from 'react'
import type { MotesOptions } from '@lucasmarkes/motes'
import { decode, encode } from './codec'
import { BASELINE } from './controls'

/** Long enough to coalesce a drag, short enough that the address bar keeps up. */
export const URL_WRITE_DELAY = 250

/**
 * The URL a config should live at. Exported and pure so the one rule worth
 * pinning — a baseline config gets a clean path, not a trailing "?" — can be
 * tested without standing up a renderer.
 */
export function urlFor(pathname: string, config: MotesOptions): string {
  const search = encode(config)
  return search ? `${pathname}?${search}` : pathname
}

function fromUrl(): MotesOptions {
  return { ...BASELINE, ...decode(window.location.search) }
}

/**
 * Config state, with the URL as its second home.
 *
 * replaceState rather than pushState: a single slider drag would otherwise
 * become two hundred history entries and the back button would stop meaning
 * anything. The debounce collapses the drag into one write.
 */
export function useConfig() {
  const [config, setConfigState] = useState<MotesOptions>(fromUrl)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mirrors state synchronously. Twelve setConfig calls inside one drag frame
  // all read the newest config from here rather than racing a batched render,
  // and it keeps schedule() out of a setState updater, which StrictMode would
  // otherwise invoke twice.
  const latest = useRef(config)

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const schedule = useCallback(
    (next: MotesOptions) => {
      cancel()
      timer.current = setTimeout(() => {
        timer.current = null
        try {
          // Read the pathname at fire time, not at schedule time: an effect
          // switch may have landed in between, and this write belongs on
          // whichever path is current.
          window.history.replaceState({}, '', urlFor(window.location.pathname, next))
        } catch {
          // Sandboxed iframes throw on replaceState. The field is still tuned;
          // only the shareable link is lost, so the feature degrades rather
          // than taking the page with it.
        }
      }, URL_WRITE_DELAY)
    },
    [cancel],
  )

  /**
   * Swap the whole config.
   *
   * `url` exists for the one case where the two differ. A journey paints its
   * first frame at the origin, but the address bar should already describe the
   * destination — otherwise copying a link during the three hundred
   * milliseconds of a Randomize hands over the field you just left. Arming it
   * once at the start also keeps the debounce from being pushed back by every
   * frame of the animation, which would delay the write until long after the
   * values had settled.
   */
  const replace = useCallback(
    (next: MotesOptions, url: MotesOptions = next) => {
      latest.current = next
      setConfigState(next)
      schedule(url)
    },
    [schedule],
  )

  /** A frame of a journey: state only. The destination was written to the
   *  address bar when the journey began, and re-scheduling it sixty times a
   *  second would only postpone it. */
  const preview = useCallback((next: MotesOptions) => {
    latest.current = next
    setConfigState(next)
  }, [])

  const setConfig = useCallback(
    (patch: Partial<MotesOptions>) => {
      const next = { ...latest.current, ...patch }
      latest.current = next
      setConfigState(next)
      schedule(next)
    },
    [schedule],
  )

  useEffect(() => {
    function onPop(): void {
      // A pending write means the config in memory is newer than the URL.
      // That is the effect-switch race: navigate() copied location.search and
      // fired popstate before the debounce landed, so the search it carried
      // over is stale. Re-assert memory onto the new path rather than reading
      // back the URL, which would silently drop the change — the exact
      // promise App.tsx makes about tuning surviving a switch.
      //
      // The cost is that a browser Back within the debounce window keeps your
      // last nudge instead of the entry's value. That needs a deliberate Back
      // inside 250ms of moving a slider, and it preserves work rather than
      // destroying it — the better way to lose this coin flip.
      if (timer.current !== null) {
        cancel()
        schedule(latest.current)
        return
      }
      const next = fromUrl()
      latest.current = next
      setConfigState(next)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      cancel()
    }
  }, [cancel, schedule])

  return { config, setConfig, replace, preview }
}
