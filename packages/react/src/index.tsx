import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react'
import {
  createMotes,
  DEFAULT_OPTIONS,
  type MotesConfig,
  type MotesInstance,
} from 'motes'

export interface MotesProps extends MotesConfig {
  className?: string
  style?: CSSProperties
}

/**
 * Thin wrapper: a canvas, an instance, and prop diffing. No extra state, so
 * changing a prop updates uniforms without re-rendering the tree.
 */
export const Motes = forwardRef<MotesInstance, MotesProps>(
  function Motes(props, ref) {
    const { className, style, ...config } = props
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const instanceRef = useRef<MotesInstance | null>(null)

    // A stable handle delegating to the live instance, so `ref.current` is
    // never null and callers need no mount check.
    useImperativeHandle(
      ref,
      () => ({
        start: () => instanceRef.current?.start(),
        stop: () => instanceRef.current?.stop(),
        set: (patch: MotesConfig) => instanceRef.current?.set(patch),
        getOptions: () => instanceRef.current?.getOptions() ?? DEFAULT_OPTIONS,
        destroy: () => instanceRef.current?.destroy(),
      }),
      [],
    )

    // Create once; options land through the diffing effect below.
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const instance = createMotes(canvas, config)
      instanceRef.current = instance
      instance.start()

      return () => {
        instance.destroy()
        instanceRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      instanceRef.current?.set(config)
    }, [
      config.effect,
      config.pointer,
      config.radius,
      config.force,
      config.speed,
      config.density,
      config.charset,
      config.accent,
      config.trail,
    ])

    return <canvas ref={canvasRef} className={className} style={style} />
  },
)
