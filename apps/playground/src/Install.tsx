import { useRef, useState } from 'react'
import { CheckIcon, CopyIcon, GitHubIcon } from './icons'
import { LINKS } from './links'
import { useStars } from './stars'

const COMMAND = 'npm i motes'

/**
 * The command and the repository, side by side and the same height.
 */
export function InstallRow() {
  return (
    <div className="install-row">
      <Install />
      <GitHubButton />
    </div>
  )
}

function Install() {
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  const command = useRef<HTMLElement>(null)

  return (
    <button
      type="button"
      className="install"
      // The word is what gets copied, so the label says the word. Without
      // this the button announces "npm i motes" and nothing about what
      // pressing it does.
      aria-label={`Copy ${COMMAND}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(COMMAND)
          setManual(false)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        } catch {
          // Denied, insecure context, or no Clipboard API. Every one of those
          // used to be swallowed here, which left the button doing visibly
          // nothing on press — the one outcome an affordance must never have.
          // Selecting the command puts it one keystroke from the clipboard
          // and is its own, very legible, feedback.
          const node = command.current
          if (node) {
            const range = document.createRange()
            range.selectNodeContents(node)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
          }
          setManual(true)
        }
      }}
    >
      <code ref={command}>{COMMAND}</code>

      {/*
        A span, not a nested button.

        The brief asks for an icon button here, and this is one everywhere it
        counts — it looks like one and it lights up on hover like one. What it
        is not is a second `<button>` inside `.install`, which is invalid HTML
        and leaves a screen reader announcing a control inside a control. The
        alternative was to demote the box to a `<div>`, which would cost the
        click-anywhere target the whole command already gives you.
      */}
      <span className="install-icon" aria-hidden="true">
        <CopyIcon className={copied ? 'is-out' : 'is-in'} />
        <CheckIcon className={copied ? 'is-in' : 'is-out'} />
      </span>

      {/* The icon is hidden from the tree, so the state change needs saying
          somewhere a screen reader will hear it — including the case where
          the copy did not happen. */}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : manual ? 'Copying is blocked — the command is selected, press Ctrl or Cmd C' : ''}
      </span>
    </button>
  )
}

function GitHubButton() {
  const stars = useStars()

  return (
    <a
      className="gh-btn"
      href={LINKS.github}
      target="_blank"
      rel="noreferrer"
      aria-label={stars === null ? 'GitHub repository' : `GitHub repository, ${stars} stars`}
    >
      <GitHubIcon />
      <span>GitHub</span>
      {/* Absent rather than zero. A fresh repository showing "0" beside a star
          reads as a verdict on the project instead of a fact about its age,
          and it is the same render path as a request that failed. */}
      {stars === null ? null : (
        <span className="gh-count" aria-hidden="true">
          {stars.toLocaleString('en-US')}
        </span>
      )}
    </a>
  )
}
