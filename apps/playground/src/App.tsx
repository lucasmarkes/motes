import { useEffect, useRef, useState } from 'react'
import { createMotes, type MotesInstance } from 'motes'

const EFFECTS = ['flow', 'waves', 'pulse'] as const

/**
 * Phase 1 verification harness. The designed playground — index grid, effect
 * pages, code tabs — lands in Phase 4.
 */
export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<MotesInstance | null>(null)

  const [effect, setEffect] = useState<string>('flow')
  const [pointer, setPointer] = useState(true)
  const [radius, setRadius] = useState(150)
  const [force, setForce] = useState(1.4)
  const [density, setDensity] = useState(13)
  const [speed, setSpeed] = useState(1)
  const [fps, setFps] = useState(0)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const instance = createMotes(canvas, { effect: 'flow' })
    instanceRef.current = instance
    instance.start()

    let frames = 0
    let last = performance.now()
    let raf = 0
    const tick = () => {
      frames++
      const now = performance.now()
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      instance.destroy()
      instanceRef.current = null
    }
  }, [])

  useEffect(() => {
    instanceRef.current?.set({ effect, pointer, radius, force, density, speed })
  }, [effect, pointer, radius, force, density, speed])

  return (
    <div className="root">
      <canvas
        ref={canvasRef}
        className="stage"
        onPointerDown={() => setTouched(true)}
        onPointerMove={() => setTouched(true)}
      />

      <div className="mark">
        motes
        <small>phase 1 · core mvp</small>
      </div>

      {pointer && !touched && (
        <div className="hint">move your cursor over the field</div>
      )}

      <div className="panel">
        <h1>{effect}</h1>
        <p className="desc">
          Procedural ASCII field. The pointer layer is shared across every
          effect — no effect contains cursor code.
        </p>

        <div className="row">
          <div className="lab">
            <span>effect</span>
          </div>
          <div className="seg">
            {EFFECTS.map((name) => (
              <button
                key={name}
                className={name === effect ? 'on' : ''}
                onClick={() => setEffect(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <button
            className={`toggle ${pointer ? 'on' : ''}`}
            onClick={() => setPointer((p) => !p)}
          >
            <span className="t-lab">interaction</span>
            <span className="track">
              <i />
            </span>
          </button>
        </div>

        <div className="hr" />

        <Slider label="pointer radius" value={radius} min={40} max={360} step={1}
                onChange={setRadius} format={(v) => v.toFixed(0)} />
        <Slider label="pointer force" value={force} min={0} max={3} step={0.1}
                onChange={setForce} format={(v) => v.toFixed(1)} />
        <Slider label="density" value={density} min={8} max={22} step={1}
                onChange={setDensity} format={(v) => v.toFixed(0)} />
        <Slider label="speed" value={speed} min={0} max={3} step={0.1}
                onChange={setSpeed} format={(v) => v.toFixed(1)} />

        <div className="hr" />

        <div className="lab">
          <span>fps</span>
          <b>{fps}</b>
        </div>
      </div>
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}

function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  return (
    <div className="row">
      <div className="lab">
        <span>{label}</span>
        <b>{format(value)}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}
