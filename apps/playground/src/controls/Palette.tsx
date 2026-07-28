import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as RKeyboardEvent, PointerEvent as RPointerEvent } from 'react'

type Channel = 'background' | 'ink' | 'accent'

interface PaletteProps {
  background: string
  ink: string
  accent: string
  onChange: (patch: Partial<Record<Channel, string>>) => void
}

interface Hsv {
  h: number
  s: number
  v: number
}

const HEX = /^#[0-9a-fA-F]{6}$/

const CHANNELS: ReadonlyArray<{ key: Channel; label: string }> = [
  { key: 'background', label: 'background' },
  { key: 'ink', label: 'ink' },
  { key: 'accent', label: 'accent' },
]

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function hsvToHex({ h, s, v }: Hsv) {
  const S = s / 100
  const V = v / 100
  const c = V * S
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = V - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m?.[1]) return { h: 0, s: 0, v: 0 }
  const int = parseInt(m[1], 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s: s * 100, v: max * 100 }
}

/**
 * One palette, not three settings.
 *
 * Three stacked colour controls, each with its own swatch row and its own
 * inline picker, would have made this panel taller than the viewport — and it
 * would have said the wrong thing, because background, ink and accent are one
 * system: the ambient ramp literally runs from the first to the second, and
 * the pointer drives it to the third. So: three chips that select, and one
 * picker that edits whichever is selected.
 *
 * The HSV state belongs to the picker, not to the channel, and it resyncs when
 * the selection changes. Hue survives a drag through the greys the same way it
 * always did — a round trip through hex would lose it at zero saturation.
 */
export function Palette({ background, ink, accent, onChange }: PaletteProps) {
  const [channel, setChannel] = useState<Channel>('accent')

  const value = channel === 'background' ? background : channel === 'ink' ? ink : accent
  // A transparent background has no hue to show; the picker edits an opaque
  // colour and the checkbox below decides whether alpha is kept.
  const transparent = value === 'transparent'
  const editable = transparent ? '#000000' : value

  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(editable))
  const [hexDraft, setHexDraft] = useState(editable.toLowerCase())
  const emitted = useRef(editable)
  const hsvRef = useRef(hsv)

  useEffect(() => {
    if (editable.toLowerCase() !== emitted.current.toLowerCase()) {
      const next = hexToHsv(editable)
      hsvRef.current = next
      setHsv(next)
      emitted.current = editable
    }
    setHexDraft(editable.toLowerCase())
  }, [editable])

  function apply(patch: Partial<Hsv>) {
    const next = { ...hsvRef.current, ...patch }
    hsvRef.current = next
    setHsv(next)
    const hex = hsvToHex(next)
    emitted.current = hex
    onChange({ [channel]: hex })
  }

  function svFromEvent(e: RPointerEvent<HTMLDivElement>) {
    if (transparent) return
    const r = e.currentTarget.getBoundingClientRect()
    apply({
      s: clamp01((e.clientX - r.left) / r.width) * 100,
      v: (1 - clamp01((e.clientY - r.top) / r.height)) * 100,
    })
  }

  function hueFromEvent(e: RPointerEvent<HTMLDivElement>) {
    if (transparent) return
    const r = e.currentTarget.getBoundingClientRect()
    apply({ h: clamp01((e.clientX - r.left) / r.width) * 360 })
  }

  function onHexInput(next: string) {
    setHexDraft(next)
    if (HEX.test(next)) {
      const hex = next.toLowerCase()
      const parsed = hexToHsv(hex)
      hsvRef.current = parsed
      setHsv(parsed)
      emitted.current = hex
      onChange({ [channel]: hex })
    }
  }

  function onSvKey(e: RKeyboardEvent<HTMLDivElement>) {
    if (transparent) return
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowRight') apply({ s: Math.min(100, hsv.s + step) })
    else if (e.key === 'ArrowLeft') apply({ s: Math.max(0, hsv.s - step) })
    else if (e.key === 'ArrowUp') apply({ v: Math.min(100, hsv.v + step) })
    else if (e.key === 'ArrowDown') apply({ v: Math.max(0, hsv.v - step) })
    else return
    e.preventDefault()
  }

  function onHueKey(e: RKeyboardEvent<HTMLDivElement>) {
    if (transparent) return
    const step = e.shiftKey ? 15 : 3
    if (e.key === 'ArrowRight') apply({ h: Math.min(360, hsv.h + step) })
    else if (e.key === 'ArrowLeft') apply({ h: Math.max(0, hsv.h - step) })
    else return
    e.preventDefault()
  }

  const hueColor = hsvToHex({ h: hsv.h, s: 100, v: 100 })

  return (
    <div className="palette">
      <div className="chips" role="radiogroup" aria-label="Palette">
        {CHANNELS.map((c) => {
          const v = c.key === 'background' ? background : c.key === 'ink' ? ink : accent
          const on = c.key === channel
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={on}
              className={`chip${on ? ' is-on' : ''}${v === 'transparent' ? ' is-transparent' : ''}`}
              onClick={() => setChannel(c.key)}
            >
              <span
                className="chip-well"
                aria-hidden="true"
                style={v === 'transparent' ? undefined : { background: v }}
              />
              <span className="chip-label">{c.label}</span>
            </button>
          )
        })}
      </div>

      {/* Alpha is a background-only idea, and no hue picker can express it. */}
      {channel === 'background' ? (
        <label className="transparent-toggle">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) =>
              onChange({ background: e.target.checked ? 'transparent' : '#050403' })
            }
          />
          <span>transparent</span>
        </label>
      ) : null}

      <div className={`picker${transparent ? ' is-disabled' : ''}`}>
        <div
          className="sv-area"
          role="slider"
          tabIndex={transparent ? -1 : 0}
          aria-label="Saturation and value"
          aria-valuetext={`saturation ${Math.round(hsv.s)}%, value ${Math.round(hsv.v)}%`}
          aria-disabled={transparent || undefined}
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            svFromEvent(e)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) svFromEvent(e)
          }}
          onKeyDown={onSvKey}
        >
          <span
            className="sv-dot"
            aria-hidden="true"
            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: editable }}
          />
        </div>

        <div
          className="hue-strip"
          role="slider"
          tabIndex={transparent ? -1 : 0}
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          aria-disabled={transparent || undefined}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            hueFromEvent(e)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) hueFromEvent(e)
          }}
          onKeyDown={onHueKey}
        >
          <span className="hue-handle" aria-hidden="true" style={{ left: `${(hsv.h / 360) * 100}%` }} />
        </div>

        <div className="picker-foot">
          <span className="preview-swatch" aria-hidden="true" style={{ background: editable }} />
          <input
            className="hex-input"
            type="text"
            inputMode="text"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Hex colour"
            value={hexDraft}
            disabled={transparent}
            onChange={(e) => onHexInput(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
