import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as RKeyboardEvent, PointerEvent as RPointerEvent } from 'react'
import { ACCENTS } from '../accents'

interface Props {
  value: string
  onChange: (v: string) => void
}

interface Hsv {
  h: number
  s: number
  v: number
}

const HEX = /^#[0-9a-fA-F]{6}$/

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
 * Pick a colour without leaving the panel.
 *
 * `<input type="color">` was the single most default-looking element on the
 * page — a control that opens an operating system on top of a page about
 * restraint. In its place: a row of neutral quick picks, and a picker that
 * lives inline in the panel, built from the panel's own fonts, radii, and
 * borders. No OS dialog, no overlay on the code.
 *
 * The prop is the one source of truth. Selecting a swatch sets the value and
 * the picker syncs to it; dragging in the picker sets the value and no swatch
 * reads as chosen, because the value no longer equals any of them. HSV is held
 * internally so hue survives a drag through the greys — a round-trip through
 * hex would lose it at zero saturation.
 */
export function AccentSwatches({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [hexDraft, setHexDraft] = useState(value.toLowerCase())

  // The last hex we emitted, so an echo of our own change does not resync HSV
  // and throw away the hue the drag is holding.
  const emitted = useRef(value)
  const hsvRef = useRef(hsv)

  useEffect(() => {
    if (value.toLowerCase() !== emitted.current.toLowerCase()) {
      const next = hexToHsv(value)
      hsvRef.current = next
      setHsv(next)
      emitted.current = value
    }
    setHexDraft(value.toLowerCase())
  }, [value])

  function apply(patch: Partial<Hsv>) {
    const next = { ...hsvRef.current, ...patch }
    hsvRef.current = next
    setHsv(next)
    const hex = hsvToHex(next)
    emitted.current = hex
    onChange(hex)
  }

  function svFromEvent(e: RPointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    apply({
      s: clamp01((e.clientX - r.left) / r.width) * 100,
      v: (1 - clamp01((e.clientY - r.top) / r.height)) * 100,
    })
  }

  function hueFromEvent(e: RPointerEvent<HTMLDivElement>) {
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
      onChange(hex)
    }
  }

  function onSvKey(e: RKeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowRight') apply({ s: Math.min(100, hsv.s + step) })
    else if (e.key === 'ArrowLeft') apply({ s: Math.max(0, hsv.s - step) })
    else if (e.key === 'ArrowUp') apply({ v: Math.min(100, hsv.v + step) })
    else if (e.key === 'ArrowDown') apply({ v: Math.max(0, hsv.v - step) })
    else return
    e.preventDefault()
  }

  function onHueKey(e: RKeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 15 : 3
    if (e.key === 'ArrowRight') apply({ h: Math.min(360, hsv.h + step) })
    else if (e.key === 'ArrowLeft') apply({ h: Math.max(0, hsv.h - step) })
    else return
    e.preventDefault()
  }

  const hueColor = hsvToHex({ h: hsv.h, s: 100, v: 100 })

  return (
    <div className="accent">
      <div className="swatches" role="radiogroup" aria-label="Accent">
        {ACCENTS.map((a) => (
          <button
            key={a.hex}
            type="button"
            role="radio"
            aria-checked={a.hex.toLowerCase() === value.toLowerCase()}
            aria-label={a.label}
            className={`swatch${a.hex.toLowerCase() === value.toLowerCase() ? ' is-on' : ''}`}
            style={{ background: a.hex }}
            onClick={() => onChange(a.hex)}
          />
        ))}

        {/* The way out. Dashed, not filled — it is not a colour, it is the
            door to all of them. */}
        <button
          type="button"
          className={`swatch-add${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-label="Custom colour"
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      {open ? (
        <div className="picker">
          <div
            className="sv-area"
            role="slider"
            tabIndex={0}
            aria-label="Saturation and value"
            aria-valuetext={`saturation ${Math.round(hsv.s)}%, value ${Math.round(hsv.v)}%`}
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
              style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: value }}
            />
          </div>

          <div
            className="hue-strip"
            role="slider"
            tabIndex={0}
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
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
            <span className="preview-swatch" aria-hidden="true" style={{ background: value }} />
            <input
              className="hex-input"
              type="text"
              inputMode="text"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Hex colour"
              value={hexDraft}
              onChange={(e) => onHexInput(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
