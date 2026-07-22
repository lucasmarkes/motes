import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as RKeyboardEvent } from 'react'

export interface Charset {
  value: string
  label: string
}

// A tuple, not an array: `readonly Charset[]` would make CHARSETS[0] possibly
// undefined under `noUncheckedIndexedAccess`, and the first entry is the
// fallback when config.charset matches nothing.
export const CHARSETS = [
  { value: ' .:-=+*#%@', label: 'classic' },
  { value: ' .·:+*oO0@', label: 'dots' },
  { value: ' ░▒▓█', label: 'blocks' },
  { value: " .'^\"~=xX", label: 'hairline' },
] as const satisfies readonly Charset[]

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * Pick the ramp by looking at it.
 *
 * The native `<select>` this replaces showed the same four names with the
 * glyphs crammed in after them, at whatever size and spacing the platform
 * felt like — which is the one thing a control for choosing a character ramp
 * must not leave to the platform. Here the trigger and every option render
 * the actual glyphs, in the mono face, at the size they are read at.
 *
 * The list is absolutely positioned, so a four-item menu costs the panel no
 * height. That is what makes showing all four ramps at once affordable.
 */
export function CharsetSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  const index = Math.max(
    0,
    CHARSETS.findIndex((c) => c.value === value),
  )
  // A config can carry a charset that is not one of these four — the option
  // takes any string. The trigger then shows the first, which is also what
  // `index` already points at.
  const current = CHARSETS[index] ?? CHARSETS[0]

  useEffect(() => {
    if (!open) return
    function onDocDown(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocDown)
    return () => document.removeEventListener('pointerdown', onDocDown)
  }, [open])

  function openAt(i: number) {
    setActive(i)
    setOpen(true)
  }

  function choose(i: number) {
    const picked = CHARSETS[i]
    if (!picked) return
    onChange(picked.value)
    setOpen(false)
    trigger.current?.focus()
  }

  function onTriggerKey(e: RKeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openAt(index)
    }
  }

  function onListKey(e: RKeyboardEvent<HTMLUListElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((a) => (a + 1) % CHARSETS.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((a) => (a - 1 + CHARSETS.length) % CHARSETS.length)
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(CHARSETS.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(active)
        break
      case 'Escape':
      case 'Tab':
        // Escape returns you where you were; Tab is allowed to leave, but the
        // menu should not be left hanging open behind you either way.
        setOpen(false)
        if (e.key === 'Escape') {
          e.preventDefault()
          trigger.current?.focus()
        }
        break
    }
  }

  return (
    <div className="pick" ref={root}>
      <button
        type="button"
        ref={trigger}
        className="pick-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Charset, ${current.label}`}
        onClick={() => (open ? setOpen(false) : openAt(index))}
        onKeyDown={onTriggerKey}
      >
        <span className="pick-name">{current.label}</span>
        <span className="ramp" aria-hidden="true">
          {current.value.trim()}
        </span>
        <span className="pick-chev" aria-hidden="true" />
      </button>

      {open ? (
        <ul
          className="pick-list"
          role="listbox"
          aria-label="Charset"
          tabIndex={-1}
          ref={(el) => el?.focus()}
          onKeyDown={onListKey}
        >
          {CHARSETS.map((c, i) => (
            <li
              key={c.label}
              role="option"
              aria-selected={i === index}
              className={`pick-opt${i === active ? ' is-active' : ''}${i === index ? ' is-on' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span className="pick-name">{c.label}</span>
              <span className="ramp" aria-hidden="true">
                {c.value.trim()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
