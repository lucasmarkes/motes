import { useEffect, useRef } from 'react'
import {
  createMotes,
  defineEffect,
  removeEffect,
  type MotesConfig,
  type MotesInstance,
} from '@lucasmarkes/motes'
import { generateField } from './codegen'
import type { StageConfig } from './pipeline'

/**
 * Live preview of a pipeline config, running the real library.
 *
 * The field it renders is the exact GLSL string the output tab will show, so
 * the preview cannot drift from the paste. A debounced edit compiles that
 * string under a fresh, unique effect name and swaps to it; `set({effect})`
 * only relinks when the name changes (see motes.ts), so a new name every time
 * is what forces the recompile. The previous name is then pruned, keeping the
 * registry from growing for the length of a session.
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

interface LabPreviewProps {
  /** The pipeline config to compile into a field. */
  stage: StageConfig
  /** Look and interaction options — everything except the effect itself. */
  look: Omit<MotesConfig, 'effect'>
  /** Called with a compile error message, or null once the field compiles. */
  onError?: (message: string | null) => void
  className?: string
  'aria-label'?: string
}

/** The effect name is owned here; a caller's look must never override it. */
function withoutEffect(look: MotesConfig): MotesConfig {
  const { effect: _effect, ...rest } = look
  return rest
}

export function LabPreview({ stage, look, onError, className, ...rest }: LabPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instRef = useRef<MotesInstance | null>(null)
  const activeName = useRef('')
  // The stage whose field is currently compiled, so the debounce effect can
  // skip its mount run (already compiled below) and any no-op re-render.
  const compiledStage = useRef<StageConfig | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Create once. The first field is compiled here so the instance never starts
  // on a built-in it would immediately have to replace.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const name = nextName()
    defineEffect(name, { glsl: generateField(stage) })
    activeName.current = name
    compiledStage.current = stage

    const inst = createMotes(canvas, { ...withoutEffect(look), effect: name })
    instRef.current = inst
    inst.start()

    return () => {
      inst.destroy()
      removeEffect(activeName.current)
      instRef.current = null
    }
    // Mount-once: later stage/look changes flow through the effects below, which
    // mutate the live instance instead of recreating it. The initial stage/look
    // are captured on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recompile on stage change, coalesced to one relink per frame.
  useEffect(() => {
    const inst = instRef.current
    if (!inst || compiledStage.current === stage) return

    const timer = setTimeout(() => {
      const name = nextName()
      const previous = activeName.current
      try {
        defineEffect(name, { glsl: generateField(stage) })
        // setEffect links the new program before deleting the old, so a bad
        // compile throws with the last-good program still bound.
        inst.set({ effect: name })
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
  }, [stage])

  // Look and interaction changes need no recompile — the uniforms update live.
  useEffect(() => {
    instRef.current?.set(withoutEffect(look))
  }, [look])

  return <canvas ref={canvasRef} className={className} {...rest} />
}
