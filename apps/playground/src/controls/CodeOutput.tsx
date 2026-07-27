import { useLayoutEffect, useRef, useState } from 'react'
import { highlight } from '../snippet'
import { CheckIcon, CopyIcon } from '../icons'
import { Swap } from '../Swap'

export interface CodeTab {
  id: string
  label: string
}

interface CodeOutputProps {
  tabs: readonly CodeTab[]
  active: string
  onTab: (id: string) => void
  /** The code under the active tab, already assembled by the caller. */
  code: string
  /** Names the tablist for assistive tech. */
  label?: string
}

/**
 * The pinned code block: a tablist with a sliding underline, a copy button, and
 * a lightly-highlighted `<pre>`.
 *
 * Lifted whole from the effect panel so the Lab's two-file output (effects.ts /
 * App.tsx) is the same block as the panel's React/Core snippet — same copy
 * affordance, same measured underline — rather than a second copy of it.
 */
export function CodeOutput({ tabs, active, onTab, code, label = 'Code' }: CodeOutputProps) {
  const [copied, setCopied] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  // The underline is one line sliding between labels of unequal width, so it is
  // measured rather than assumed. It rides on transform alone — a 1px base
  // translated and scaled to the active tab — so the slide stays on the GPU and
  // never animates layout. Runs before paint, so the first frame is placed.
  useLayoutEffect(() => {
    const list = tabsRef.current
    const on = list?.querySelector<HTMLElement>('[role="tab"].on')
    if (!list || !on) return
    list.style.setProperty('--u-x', `${on.offsetLeft}px`)
    list.style.setProperty('--u-w', `${on.offsetWidth}`)
  }, [active])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      // Clipboard unavailable; the code is selectable either way.
    }
  }

  return (
    <section className="code">
      <div className="tabs" role="tablist" aria-label={label} ref={tabsRef}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            className={t.id === active ? 'on' : ''}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button type="button" className="copy" onClick={copy}>
          <span className="copy-icon" aria-hidden="true">
            <CopyIcon className={copied ? 'is-out' : 'is-in'} />
            <CheckIcon className={copied ? 'is-in' : 'is-out'} />
          </span>
          <Swap on="Copied" off="Copy" active={copied} />
        </button>
        {/* Slides under the active tab; measured in the layout effect above. */}
        <span className="tab-underline" aria-hidden="true" />
      </div>
      <pre>
        <code>
          {highlight(code).map((token, i) => (
            <span key={i} className={`t-${token.kind}`}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </section>
  )
}
