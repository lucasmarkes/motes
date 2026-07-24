import { useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react'

export interface SliderProps {
  label: string
  unit?: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  /**
   * Drop the name/value/scrub row and render only the track. The Lab's pipeline
   * columns show a stage's one value in the column header, so repeating it in a
   * label above the track would be the very row the dock was collapsing. The
   * track drag and the arrow keys stay; only the label-scrub — which had nowhere
   * to live without its number — is gone, and the wider column track pays it back.
   */
  bare?: boolean
  onChange: (v: number) => void
  format: (v: number) => string
}

/**
 * Snap to the step grid, clamp to the range, and stop float drift there.
 *
 * Three of the five sliders on this panel step by 0.1 or 0.01, and naive
 * arithmetic on those produces 0.30000000000000004. That is not a display
 * problem to be papered over by `format` — the number goes on to the renderer
 * as a uniform, so it gets fixed at the source.
 */
function quantise(raw: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((raw - min) / step) * step
  const clamped = Math.min(max, Math.max(min, snapped))
  const decimals = (String(step).split('.')[1] ?? '').length
  return decimals ? parseFloat(clamped.toFixed(decimals)) : clamped
}

/**
 * A slider, built rather than styled.
 *
 * `<input type="range">` is gone, and with it the six vendor pseudo-element
 * rules that used to chase its thumb across two engines. What comes back in
 * return is everything the native element was doing for free: the role, the
 * value semantics, the arrow keys, and the drag. That is the trade, and it is
 * why there is a keyboard walk in the verification for this task.
 */
export function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  disabled,
  bare,
  onChange,
  format,
}: SliderProps) {
  const track = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)

  const pct = ((value - min) / (max - min)) * 100

  function fromClientX(clientX: number): number {
    const el = track.current
    if (!el) return value
    const r = el.getBoundingClientRect()
    if (r.width === 0) return value
    return quantise(min + ((clientX - r.left) / r.width) * (max - min), min, max, step)
  }

  function onTrackDown(e: RPointerEvent<HTMLDivElement>) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    // Focus explicitly: a pointer press on a div does not move focus, and the
    // arrow keys should work on whatever you just grabbed.
    e.currentTarget.focus()
    setDragging(true)
    onChange(fromClientX(e.clientX))
  }

  function onTrackMove(e: RPointerEvent<HTMLDivElement>) {
    if (disabled || !dragging) return
    onChange(fromClientX(e.clientX))
  }

  function endDrag(e: RPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
  }

  function onKeyDown(e: RKeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    const page = step * 10
    let next: number
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - step
        break
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + step
        break
      case 'PageDown':
        next = value - page
        break
      case 'PageUp':
        next = value + page
        break
      case 'Home':
        next = min
        break
      case 'End':
        next = max
        break
      default:
        return
    }
    // Otherwise the arrows scroll the panel out from under the control.
    e.preventDefault()
    onChange(quantise(next, min, max, step))
  }

  /**
   * Drag the label to scrub the value.
   *
   * The whole range in 300px of travel, wherever the pointer goes — capture
   * means the drag survives leaving the label, and `movementX` keeps it
   * relative so there is no jump on the first pixel.
   */
  function onLabelDown(e: RPointerEvent<HTMLDivElement>) {
    if (disabled) return
    e.preventDefault() // no text selection while scrubbing
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
  }

  function onLabelMove(e: RPointerEvent<HTMLDivElement>) {
    if (disabled || !scrubbing) return
    onChange(quantise(value + e.movementX * ((max - min) / 300), min, max, step))
  }

  function endScrub(e: RPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setScrubbing(false)
  }

  return (
    <section className={`ctl slider${bare ? ' is-bare' : ''}${disabled ? ' is-disabled' : ''}`}>
      {bare ? null : (
        <div
          className="lab"
          onPointerDown={onLabelDown}
          onPointerMove={onLabelMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        >
          <span>{label}</span>
          <b>
            {format(value)}
            {unit ? <em>{unit}</em> : null}
          </b>
        </div>
      )}

      <div
        ref={track}
        className="track-hit"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={`${format(value)}${unit ?? ''}`}
        aria-disabled={disabled || undefined}
        data-drag={dragging || undefined}
        onPointerDown={onTrackDown}
        onPointerMove={onTrackMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <span className="track-line" aria-hidden="true">
          <span className="track-fill" style={{ inlineSize: `${pct}%` }} />
        </span>
        <span className="thumb" aria-hidden="true" style={{ insetInlineStart: `${pct}%` }} />
      </div>
    </section>
  )
}
