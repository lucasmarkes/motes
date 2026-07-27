import { useEffect, useRef, type RefObject } from 'react'
import {
  DEFAULT_OPTIONS,
  defineEffect,
  removeEffect,
  type MotesConfig,
} from '@lucasmarkes/motes'
import { generateField } from './codegen'
import type { StageConfig } from './pipeline'
import type { FieldHandle } from '../Field'

/**
 * Drive the one hoisted field from a pipeline config, running the real library.
 *
 * The field it renders is the exact GLSL string the output tab shows, so the
 * preview cannot drift from the paste. A debounced edit compiles that string
 * under a fresh, unique effect name and swaps to it; `set({ effect })` only
 * relinks when the name changes (see motes.ts), so a new name every time is
 * what forces the recompile. The previous name is then pruned, keeping the
 * registry from growing for the length of a session.
 *
 * Ownership is borrowed, not owned. Before the field was hoisted this logic
 * lived in a component that created its own instance and destroyed it on
 * unmount; now the instance lives above the router, so the Lab compiles into a
 * field it did not create and, on the way out, hands it back — repointing to a
 * built-in first, so the renderer is never left bound to a name that is then
 * deleted, and pruning the trailing `__lab_N`. The next route sets its own
 * effect over that built-in; it is a safe intermediate, never shown.
 *
 * Crucially, nothing here touches the pointer. The cursor reacts because the
 * renderer applies it after `field()` returns, the same for every effect — the
 * whole point of the composer.
 */

// Monotonic across the session; no compile ever reuses a name.
let seq = 0
const nextName = () => `__lab_${++seq}`

/** One frame — and it is not the old release-debounce shrunk down. The relink was
 *  measured at ~3ms on real GPU hardware (p95 ~4ms, cold or warm), well under a
 *  frame, so the field tracks the slider live instead of settling on release. What
 *  this timer still does is coalesce: a drag can fire several input events within a
 *  single frame, each a re-render that would relink, and the timer collapses them
 *  into one relink per frame. Do not set it to 0 — that is not "instant", it is one
 *  synchronous relink per event, several per frame. This is load-bearing, not a
 *  leftover. */
const DEBOUNCE_MS = 16

/** The effect name is owned here; a caller's look must never override it. */
function withoutEffect(look: MotesConfig): MotesConfig {
  const { effect: _effect, ...rest } = look
  return rest
}

export function useLabField(
  fieldRef: RefObject<FieldHandle | null>,
  stage: StageConfig,
  look: Omit<MotesConfig, 'effect'>,
  onError?: (message: string | null) => void,
): void {
  const activeName = useRef('')
  // The stage whose field is currently compiled, so the debounce effect can
  // skip its mount run (already compiled below) and any no-op re-render.
  const compiledStage = useRef<StageConfig | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Latest stage/look for the borrow effect: it runs once, but must compile the
  // composition as it stands at entry rather than a value frozen at first mount.
  const stageRef = useRef(stage)
  stageRef.current = stage
  const lookRef = useRef(look)
  lookRef.current = look

  // Borrow the field: compile the current composition into it and start it. The
  // first field is compiled here so the instance never dwells on the built-in it
  // was repointed to on the way in. On exit, hand it back — see the note above.
  useEffect(() => {
    const field = fieldRef.current
    if (!field) return

    const name = nextName()
    defineEffect(name, { glsl: generateField(stageRef.current) })
    activeName.current = name
    compiledStage.current = stageRef.current

    field.set({ ...withoutEffect(lookRef.current), effect: name })
    field.start()

    return () => {
      // Repoint before pruning: the renderer must never be left bound to a name
      // we are about to delete. The next route paints its own effect over this.
      field.set({ effect: DEFAULT_OPTIONS.effect })
      removeEffect(activeName.current)
    }
  }, [fieldRef])

  // Recompile on stage change, coalesced to one relink per frame.
  useEffect(() => {
    const field = fieldRef.current
    if (!field || compiledStage.current === stage) return

    const timer = setTimeout(() => {
      const name = nextName()
      const previous = activeName.current
      try {
        defineEffect(name, { glsl: generateField(stage) })
        // set links the new program before deleting the old, so a bad compile
        // throws with the last-good program still bound.
        field.set({ effect: name })
        activeName.current = name
        compiledStage.current = stage
        removeEffect(previous)
        onErrorRef.current?.(null)
      } catch (err) {
        removeEffect(name)
        onErrorRef.current?.(err instanceof Error ? err.message : String(err))
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [stage, fieldRef])

  // Look and interaction changes need no recompile — the uniforms update live.
  useEffect(() => {
    fieldRef.current?.set(withoutEffect(look))
  }, [look, fieldRef])
}
