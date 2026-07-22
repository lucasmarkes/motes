import { useEffect, useRef, useState } from 'react'

/**
 * Hidden until it has been on screen once.
 *
 * Returns a ref to hang on the element and a boolean that is `true` only while
 * the element is still waiting its turn. Nothing here decides what "hidden"
 * looks like — that is one class in the stylesheet, so the whole animation is
 * a CSS transition and can be interrupted and retargeted mid-flight rather
 * than restarting from zero the way a keyframe would.
 *
 * The default is visible, and it is the default on purpose. The hidden state
 * is opted into at first render, and only when there is something that can
 * take the element back out of it: an `IntersectionObserver` to fire, and a
 * visitor who has not asked for less motion. A browser without the observer,
 * or one whose owner has reduced motion turned on, never returns `true` and
 * so never has anything to reveal — rather than being handed an invisible
 * page and a promise that some JavaScript will fix it.
 *
 * This is a Vite SPA with no server render, so reading the media query during
 * render is safe: there is no server pass to disagree with it.
 */
export function useReveal<T extends Element>(): [
  ref: React.RefObject<T | null>,
  hidden: boolean,
] {
  const ref = useRef<T>(null)

  const [hidden, setHidden] = useState(
    () =>
      typeof IntersectionObserver === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (!hidden) return

    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        setHidden(false)
        io.disconnect()
      },
      // A tenth of the tile, and only once it has cleared the bottom tenth of
      // the window: enough that the reveal reads as a response to scrolling
      // rather than as something that had already finished by the time the
      // element arrived.
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [hidden])

  return [ref, hidden]
}
