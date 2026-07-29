import { useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react'
import { quantise } from '../config/quantise'
import { detent, fillSpan, keyRepeatStep, parseTyped, tickStops } from './geometry'

export interface SliderProps {
  label: string
  unit?: string
  value: number
  /** Where this control rests when nothing has been tuned. The fill runs from
   *  here, the notch marks it, and a double-click returns to it. */
  baseline: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (v: number) => void
  format: (v: number) => string
}

/** A scrub covering less than this many pixels was a click, and a click on the
 *  readout means someone wants to type a number. */
const CLICK_SLOP = 3

/** Whole range in 300px of scrub, or a tenth of that with Shift held. */
const SCRUB_TRAVEL = 300
const FINE = 0.1

/**
 * A slider, built rather than styled.
 *
 * `<input type="range">` is gone, and with it the six vendor pseudo-element
 * rules that used to chase its thumb across two engines. What comes back in
 * return is everything the native element was doing for free: the role, the
 * value semantics, the arrow keys, and the drag. That is the trade, and it is
 * why there is a keyboard walk in the verification for this task.
 *
 * Three things it does that a range input cannot. The fill is drawn from the
 * baseline rather than the minimum, so the bar reports how far the field has
 * been moved instead of where the number sits in its bounds. The readout is
 * an input, so an exact value can be typed instead of hunted for. And a range
 * with countable steps is ticked at them, because density has fifteen
 * positions and drawing it as a continuum invites a precision it does not
 * have.
 */
export function Slider({
  label,
  unit,
  value,
  baseline,
  min,
  max,
  step,
  disabled,
  onChange,
  format,
}: SliderProps) {
  const track = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [editing, setEditing] = useState(false)

  // Whether the pointer went down on the number, and whether it then travelled
  // far enough to count as a scrub. Refs, because neither should repaint the
  // control mid-gesture.
  const downOnValue = useRef(false)
  const startX = useRef(0)
  const lastX = useRef(0)
  const moved = useRef(false)
  /**
   * The gesture's own value, before it is snapped to the step.
   *
   * Quantising each event against the emitted value throws away every
   * movement worth less than half a step, and since the browser reports a
   * slow drag as many small events rather than one large one, that is most of
   * a slow drag. Dragging the density label — fourteen steps across three
   * hundred pixels — moved nothing at all unless a single event happened to
   * carry more than twenty-one pixels. Accumulating here and snapping only on
   * the way out makes the control answer the hand instead of the sample rate.
   */
  const raw = useRef(value)
  // Set when Enter or Escape has already decided the edit, so the blur that
  // follows returning focus to the track does not decide it a second time.
  const resolved = useRef(false)
  /** How many auto-repeats the held arrow has fired, which is what the ramp
   *  reads. A ref: the count changes faster than the value does and nothing
   *  is drawn from it. */
  const repeats = useRef(0)

  const pct = ((value - min) / (max - min)) * 100
  const basePct = ((baseline - min) / (max - min)) * 100
  const fill = fillSpan(value, baseline, min, max)
  const stops = tickStops(min, max, step)

  /** Where along the track a pointer is, unsnapped and inside the bounds. */
  function rawFromClientX(clientX: number): number {
    const el = track.current
    if (!el) return raw.current
    const r = el.getBoundingClientRect()
    if (r.width === 0) return raw.current
    const at = min + ((clientX - r.left) / r.width) * (max - min)
    return Math.min(max, Math.max(min, at))
  }

  /** Value units per pixel of track, or 0 before the track has been laid out. */
  function perPixel(): number {
    const r = track.current?.getBoundingClientRect()
    if (!r || r.width === 0) return 0
    return (max - min) / r.width
  }

  /**
   * The value a gesture position should emit.
   *
   * Applied on the way out and never written back to `raw`, which is the
   * whole trick: `raw` stays the honest position of the hand, so the well
   * resists the value once on each event instead of compounding until the
   * control is welded to its origin. A fine gesture skips it — someone
   * holding Shift is asking for precision, and resistance is the opposite of
   * what they asked for.
   */
  function settle(v: number, fine: boolean): number {
    const at = fine ? v : detent(v, baseline, perPixel())
    return quantise(at, min, max, step)
  }

  /** Move the gesture's own value, then emit it snapped. Clamped as it goes,
   *  so dragging past an end and back does not spend the overshoot first. */
  function nudge(by: number, fine: boolean) {
    raw.current = Math.min(max, Math.max(min, raw.current + by))
    onChange(settle(raw.current, fine))
  }

  /**
   * How much a pixel of travel is worth while Shift is held.
   *
   * Deliberately relative, where the plain drag is absolute. Scaling the
   * absolute mapping instead — easing the value a tenth of the way toward the
   * pointer on every move — reads as fine for one event and then converges:
   * hold the drag still long enough and the value arrives exactly where an
   * unshifted drag would have put it. A gain on the delta stays a tenth
   * however many events the browser chooses to send.
   */
  function finePerPixel(): number {
    return perPixel() * FINE
  }

  function onTrackDown(e: RPointerEvent<HTMLDivElement>) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    // Focus explicitly: a pointer press on a div does not move focus, and the
    // arrow keys should work on whatever you just grabbed.
    e.currentTarget.focus()
    setDragging(true)
    lastX.current = e.clientX
    // A shifted press is a request to adjust from here, so it must not first
    // fling the value to wherever the pointer happened to land.
    if (e.shiftKey) {
      raw.current = value
      return
    }
    raw.current = rawFromClientX(e.clientX)
    onChange(settle(raw.current, false))
  }

  function onTrackMove(e: RPointerEvent<HTMLDivElement>) {
    if (disabled || !dragging) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    if (e.shiftKey) {
      nudge(dx * finePerPixel(), true)
      return
    }
    // Absolute: the thumb comes to the pointer. The gesture value follows, so
    // reaching for Shift mid-drag carries on from here rather than jumping.
    raw.current = rawFromClientX(e.clientX)
    onChange(settle(raw.current, false))
  }

  function endDrag(e: RPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
  }

  function onKeyDown(e: RKeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    // Enter opens the editor, so typing an exact value is not a mouse-only
    // affordance. Escape closes it, and both are handled on the input.
    if (e.key === 'Enter') {
      e.preventDefault()
      openEditor()
      return
    }
    // A fresh press reports repeat: false, which is the reset — hold Right,
    // then press Left, and the ramp starts over in the new direction.
    repeats.current = e.repeat ? repeats.current + 1 : 0
    // Arrows only. Page is already worth ten, and Home/End are absolute.
    const arrow = step * keyRepeatStep(repeats.current, (max - min) / step)
    const page = step * 10
    let next: number
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - arrow
        break
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + arrow
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
   *
   * The number inside the label is also the type target, so the gesture is
   * resolved on release rather than on press: travel far enough and it was a
   * scrub, stay put and it was a click asking for the editor. Deciding on
   * press would mean choosing between the two affordances instead of keeping
   * both.
   */
  function onLabelDown(e: RPointerEvent<HTMLDivElement>) {
    if (disabled || editing) return
    e.preventDefault() // no text selection while scrubbing
    e.currentTarget.setPointerCapture(e.pointerId)
    downOnValue.current = Boolean((e.target as HTMLElement).closest('.lab-value'))
    startX.current = e.clientX
    lastX.current = e.clientX
    raw.current = value
    moved.current = false
    setScrubbing(true)
  }

  // Travel measured against the last event rather than read from `movementX`,
  // which not every environment fills in and which says nothing the two
  // positions do not already say.
  function onLabelMove(e: RPointerEvent<HTMLDivElement>) {
    if (disabled || !scrubbing) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    if (!moved.current) {
      if (Math.abs(e.clientX - startX.current) <= CLICK_SLOP) return
      moved.current = true
    }
    const travel = e.shiftKey ? SCRUB_TRAVEL / FINE : SCRUB_TRAVEL
    nudge(dx * ((max - min) / travel), e.shiftKey)
  }

  function endScrub(e: RPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (scrubbing && !moved.current && downOnValue.current) openEditor()
    setScrubbing(false)
  }

  function openEditor() {
    resolved.current = false
    setEditing(true)
  }

  function commit(raw: string) {
    const parsed = parseTyped(raw, min, max, step)
    if (parsed !== null) onChange(parsed)
    setEditing(false)
  }

  return (
    <section
      className={`ctl slider${disabled ? ' is-disabled' : ''}`}
      data-drag={dragging || scrubbing || undefined}
    >
      <div
        className="lab"
        onPointerDown={onLabelDown}
        onPointerMove={onLabelMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
      >
        <span>{label}</span>
        {editing ? (
          <input
            className="lab-input"
            defaultValue={String(value)}
            aria-label={label}
            inputMode="decimal"
            autoComplete="off"
            // Autofocus by ref rather than the attribute, so the selection
            // happens in the same beat and the old value is typed over.
            ref={(el) => el?.select()}
            onKeyDown={(e) => {
              // Both branches mark the edit resolved before returning focus,
              // because focusing the track blurs the input while it is still
              // mounted — and an unguarded blur handler would then commit the
              // very text Escape was pressed to discard.
              if (e.key === 'Enter') {
                e.preventDefault()
                resolved.current = true
                commit(e.currentTarget.value)
                track.current?.focus()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                resolved.current = true
                setEditing(false)
                track.current?.focus()
              }
              // The panel below listens for arrows and Home/End; while a value
              // is being typed those belong to the caret.
              e.stopPropagation()
            }}
            onBlur={(e) => {
              if (resolved.current) return
              commit(e.currentTarget.value)
            }}
          />
        ) : (
          <b className="lab-value" title="Click to type a value">
            {format(value)}
            {unit ? <em>{unit}</em> : null}
          </b>
        )}
      </div>

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
        title={`Double-click to return to ${format(baseline)}${unit ?? ''}`}
        onPointerDown={onTrackDown}
        onPointerMove={onTrackMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => !disabled && onChange(baseline)}
        onKeyDown={onKeyDown}
      >
        <span className="track-line" aria-hidden="true">
          <span
            className="track-fill"
            style={{ insetInlineStart: `${fill.start}%`, insetInlineEnd: `${100 - fill.end}%` }}
          />
        </span>

        {/* Only where the steps can be counted. Three hundred marks on radius
            would draw a grey smear and promise a precision the eye cannot
            use; fifteen on density are the positions themselves. */}
        {stops !== null ? (
          <span className="ticks" aria-hidden="true">
            {Array.from({ length: stops + 1 }, (_, i) => (
              <i
                key={i}
                className={i === 0 || i === stops ? 'edge' : undefined}
                style={{ insetInlineStart: `${(i / stops) * 100}%` }}
              />
            ))}
          </span>
        ) : null}

        {/* Under the line rather than across it: a control resting at its
            baseline puts the thumb exactly on the mark, and that is the one
            moment the origin most needs to be legible. */}
        <span className="notch" aria-hidden="true" style={{ insetInlineStart: `${basePct}%` }} />

        <span className="thumb" aria-hidden="true" style={{ insetInlineStart: `${pct}%` }} />
      </div>

      {stops !== null ? (
        <div className="scale" aria-hidden="true">
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      ) : null}
    </section>
  )
}
