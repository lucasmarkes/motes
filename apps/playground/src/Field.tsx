import {
  useEffect,
  useImperativeHandle,
  useRef,
  type CanvasHTMLAttributes,
  type Ref,
} from 'react'
import { createMotes, type MotesConfig, type MotesInstance } from '@lucasmarkes/motes'

/**
 * The one field, hoisted above the router.
 *
 * A single WebGL context, created once and kept for the app's lifetime: routes
 * repoint it with `set({ effect })` instead of tearing it down and building
 * another, so navigation morphs the running field in place — the phosphor trail
 * carries the old effect out as the new one draws in — rather than hard-cutting
 * between two contexts that never coexist. It is also cheaper: one context, not
 * a teardown and a create per navigation.
 *
 * Unlike `<Motes>`, this holds no declarative option props and does no diffing.
 * That is deliberate. The Lab drives this same instance imperatively — it
 * live-compiles an effect, links it, and prunes the previous one, keeping the
 * last-good field on a bad shader — and a component that re-asserted props on
 * every render would clobber those sets on the next parent re-render. So the
 * field is steered entirely through the handle: one field, two drivers, and
 * only the library's own `<Motes>` — not this — is the public contract.
 */
export interface FieldHandle {
  set: (patch: MotesConfig) => void
  start: () => void
  stop: () => void
}

type FieldCanvasProps = Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  'width' | 'height'
>

interface FieldProps extends FieldCanvasProps {
  /** Options the instance is created with. Read once, at mount; every later
   *  change is driven through the handle, never through a re-render. */
  initial: MotesConfig
  ref?: Ref<FieldHandle>
}

export function Field({ initial, ref, ...canvasProps }: FieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instRef = useRef<MotesInstance | null>(null)

  // Captured once — later prop changes are ignored on purpose; the field is
  // steered through the handle, not through props.
  const initialRef = useRef(initial)

  // A stable handle over the live instance, so a driver's call is never
  // null-guarded and survives re-renders. It reads instRef lazily, so it is
  // valid the moment the instance exists — which, for a child, is before any
  // parent effect that would drive it runs.
  useImperativeHandle(
    ref,
    () => ({
      set: (patch: MotesConfig) => instRef.current?.set(patch),
      start: () => instRef.current?.start(),
      stop: () => instRef.current?.stop(),
    }),
    [],
  )

  // Created once, destroyed only when the app itself unmounts. createMotes does
  // not paint on construction — the field stays dark until a driver sets its
  // effect and calls start(), which is what keeps a fresh load flash-free.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const inst = createMotes(canvas, initialRef.current)
    instRef.current = inst
    return () => {
      inst.destroy()
      instRef.current = null
    }
  }, [])

  return <canvas ref={canvasRef} {...canvasProps} />
}
