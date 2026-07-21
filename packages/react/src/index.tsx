import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type CanvasHTMLAttributes,
} from 'react'
import {
  createMotes,
  DEFAULT_OPTIONS,
  type MotesConfig,
  type MotesInstance,
} from 'motes'

const OPTION_KEYS = [
  'effect',
  'pointer',
  'radius',
  'force',
  'speed',
  'density',
  'charset',
  'accent',
  'trail',
] as const

/**
 * Canvas attributes minus the ones motes owns: `width` and `height` are the
 * drawing buffer, driven by the element's CSS box and devicePixelRatio.
 */
type CanvasProps = Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  'width' | 'height' | keyof MotesConfig
>

export interface MotesProps extends MotesConfig, CanvasProps {}

/** Only the keys that actually changed, or null if none did. */
function diffConfig(next: MotesConfig, prev: MotesConfig): MotesConfig | null {
  let patch: MotesConfig | null = null
  for (const key of OPTION_KEYS) {
    if (next[key] !== prev[key]) {
      patch ??= {}
      Object.assign(patch, { [key]: next[key] })
    }
  }
  return patch
}

/**
 * Thin wrapper: a canvas, an instance, and prop diffing.
 *
 * Holds no state, so changing a prop updates uniforms without re-rendering
 * the tree. Sizing comes from CSS — give the canvas a box via `className` or
 * `style` and the instance follows it.
 */
export const Motes = forwardRef<MotesInstance, MotesProps>(
  function Motes(props, ref) {
    const {
      effect,
      pointer,
      radius,
      force,
      speed,
      density,
      charset,
      accent,
      trail,
      style,
      ...canvasProps
    } = props

    const config: MotesConfig = {
      effect,
      pointer,
      radius,
      force,
      speed,
      density,
      charset,
      accent,
      trail,
    }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const instanceRef = useRef<MotesInstance | null>(null)

    // Latest config, so the mount effect can read current props without
    // listing them as dependencies and re-creating the instance.
    const configRef = useRef(config)
    configRef.current = config

    // What the instance was last told, so diffing survives re-renders that
    // change nothing.
    const appliedRef = useRef<MotesConfig>({})

    // A stable handle delegating to the live instance, so `ref.current` is
    // never null and callers need no mount check.
    useImperativeHandle(
      ref,
      () => ({
        start: () => instanceRef.current?.start(),
        stop: () => instanceRef.current?.stop(),
        set: (patch: MotesConfig) => {
          // Keep the diff baseline honest when callers bypass props.
          Object.assign(appliedRef.current, patch)
          instanceRef.current?.set(patch)
        },
        getOptions: () => instanceRef.current?.getOptions() ?? DEFAULT_OPTIONS,
        destroy: () => instanceRef.current?.destroy(),
      }),
      [],
    )

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const initial = configRef.current
      const instance = createMotes(canvas, initial)
      instanceRef.current = instance
      appliedRef.current = { ...initial }
      instance.start()

      return () => {
        instance.destroy()
        instanceRef.current = null
        appliedRef.current = {}
      }
    }, [])

    // No dependency array: the diff decides whether anything reaches the
    // instance, which keeps this correct as options are added.
    useEffect(() => {
      const instance = instanceRef.current
      if (!instance) return

      const patch = diffConfig(config, appliedRef.current)
      if (!patch) return

      Object.assign(appliedRef.current, patch)
      instance.set(patch)
    })

    const mergedStyle: CSSProperties = { display: 'block', ...style }

    return <canvas ref={canvasRef} style={mergedStyle} {...canvasProps} />
  },
)
