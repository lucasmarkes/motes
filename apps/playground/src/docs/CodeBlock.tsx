import { useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from '../icons'
import { highlight, type HighlightLang, type Token } from '../snippet'

interface CodeBlockProps {
  code: string
  lang?: HighlightLang
  /** Shown in the tab row when multiple blocks sit together. */
  label?: string
}

export function CodeBlock({ code, lang = 'ts', label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setManual(false)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      const node = preRef.current
      if (node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      setManual(true)
    }
  }

  const tokens = highlight(code, lang)

  return (
    <figure className="doc-code">
      <div className="doc-code-head">
        {label ? <span className="doc-code-label">{label}</span> : <span />}
        <button
          type="button"
          className="doc-code-copy"
          aria-label={`Copy code${label ? `: ${label}` : ''}`}
          onClick={() => void copy()}
        >
          <span className="copy-icon" aria-hidden="true">
            <CopyIcon className={copied ? 'is-out' : 'is-in'} />
            <CheckIcon className={copied ? 'is-in' : 'is-out'} />
          </span>
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre ref={preRef}>
        <code>
          {tokens.map((tok: Token, i: number) => (
            <span key={i} className={`t-${tok.kind}`}>
              {tok.text}
            </span>
          ))}
        </code>
      </pre>
      <span className="sr-only" aria-live="polite">
        {copied
          ? 'Copied'
          : manual
            ? 'Copy blocked — code selected, press Ctrl or Cmd C'
            : ''}
      </span>
    </figure>
  )
}
