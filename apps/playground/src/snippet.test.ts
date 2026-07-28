import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, type MotesOptions } from '@lucasmarkes/motes'
import { coreSnippet, reactSnippet } from './snippet'

const base: MotesOptions = { ...DEFAULT_OPTIONS }

describe('coreSnippet / reactSnippet — tuned option filtering', () => {
  it('omits contrast and brightness at their defaults', () => {
    const core = coreSnippet(base)
    const react = reactSnippet(base)
    expect(core).not.toContain('contrast')
    expect(core).not.toContain('brightness')
    expect(react).not.toContain('contrast')
    expect(react).not.toContain('brightness')
  })

  it('emits contrast when it differs from the default', () => {
    const config: MotesOptions = { ...base, contrast: 0 }
    expect(coreSnippet(config)).toContain('contrast: 0,')
    expect(reactSnippet(config)).toContain('contrast={0}')
  })

  it('emits brightness when it differs from the default', () => {
    const config: MotesOptions = { ...base, brightness: 0.5 }
    expect(coreSnippet(config)).toContain('brightness: 0.5,')
    expect(reactSnippet(config)).toContain('brightness={0.5}')
  })

  it('quotes a transparent background as a string in both snippet forms', () => {
    // The Glass preset's shape: background goes to the literal string
    // 'transparent', not a bare identifier a JS parser would choke on.
    const config: MotesOptions = { ...base, background: 'transparent', ink: '#ffffff' }
    expect(coreSnippet(config)).toContain("background: 'transparent',")
    expect(reactSnippet(config)).toContain('background="transparent"')
  })

  it('never emits respectMotionPreference, which has no panel control', () => {
    // Not reachable through the panel, but worth pinning: even a config that
    // disagrees with the default on this key must not leak into the snippet.
    const config: MotesOptions = { ...base, respectMotionPreference: false }
    expect(coreSnippet(config)).not.toContain('respectMotionPreference')
    expect(reactSnippet(config)).not.toContain('respectMotionPreference')
  })
})
