import { useEffect, useState } from 'react'

/**
 * True on the first mount of the page's life, false forever after.
 *
 * The entrance is a load animation, and load happens once. Routing here swaps
 * the whole route component, so coming back to `/` from an effect page mounts
 * `Index` again from scratch — and a purely declarative CSS entrance would
 * replay in full every time, which turns a first impression into a tic. The
 * flag lives at module scope rather than in state because it has to outlive
 * the component that reads it; nothing unmounts a module.
 *
 * The flip happens in an effect, not in the state initialiser. Under
 * StrictMode React invokes initialisers twice and keeps one result, so an
 * initialiser that wrote to the flag would be a coin toss between "played"
 * and "not played" in development. Reading is pure, writing is a side effect,
 * and they go where each belongs.
 *
 * Nothing here decides what the entrance looks like — that is one class in
 * the stylesheet, the same division reveal.ts draws.
 */

let played = false

export function useEntrance(): boolean {
  const [first] = useState(() => !played)

  useEffect(() => {
    played = true
  }, [])

  return first
}
