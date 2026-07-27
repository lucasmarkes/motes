import { describe, expect, it } from 'vitest'
import { labSource } from './source'
import { generateField } from './codegen'
import { DEFAULT_CONFIG, DEFAULT_LOOK, PRESETS, type LabConfig } from './pipeline'

const CLASSNAME = 'fixed inset-0 -z-10 h-full w-full pointer-events-none'

describe('labSource — effects.ts tab', () => {
  it('registers the effect under its name with defineEffect', () => {
    const out = labSource('effects', DEFAULT_CONFIG)
    expect(out).toContain(`import { defineEffect } from '@lucasmarkes/motes'`)
    expect(out).toContain(`defineEffect('mine', {`)
  })

  it('embeds the exact field the preview compiles', () => {
    const config: LabConfig = { ...DEFAULT_CONFIG, stage: PRESETS.aurora }
    const out = labSource('effects', config)
    // Every line of the generated field appears verbatim (indented) in the output.
    for (const line of generateField(PRESETS.aurora).split('\n')) {
      expect(out).toContain(line)
    }
  })

  it('sanitizes an unsafe name into the registration', () => {
    const out = labSource('effects', { ...DEFAULT_CONFIG, name: 'my fire!' })
    expect(out).toContain(`defineEffect('myfire', {`)
  })
})

describe('labSource — App.tsx tab', () => {
  it('renders <Motes> with the effect, the pinned className, and imports the effect', () => {
    const out = labSource('app', DEFAULT_CONFIG)
    expect(out).toContain(`import { Motes } from '@lucasmarkes/motes-react'`)
    expect(out).toContain(`import './effects'`)
    expect(out).toContain(`effect="mine"`)
    expect(out).toContain(`className="${CLASSNAME}"`)
  })

  it('writes pointer as a bare prop when on, and explicit when off', () => {
    expect(labSource('app', DEFAULT_CONFIG)).toMatch(/\n\s*pointer\n/)
    const off: LabConfig = { ...DEFAULT_CONFIG, look: { ...DEFAULT_LOOK, pointer: false } }
    expect(labSource('app', off)).toContain(`pointer={false}`)
  })

  it('emits only the look values that differ from the library defaults', () => {
    const out = labSource('app', DEFAULT_CONFIG)
    // radius and charset are the library defaults, so omitting them is lossless.
    expect(out).not.toContain('radius=')
    expect(out).not.toContain('charset=')
    // The accent is NOT the library default — the Lab opens on the page's cool
    // near-white, not the shipped warm orange — so it must be written out, or
    // the paste would render a different colour than the preview showed.
    expect(out).toContain(`accent="#ddeafe"`)
  })

  it('emits a tuned look value with the right JSX literal form', () => {
    const config: LabConfig = {
      ...DEFAULT_CONFIG,
      look: { ...DEFAULT_LOOK, accent: '#ff8800', radius: 220 },
    }
    const out = labSource('app', config)
    expect(out).toContain(`accent="#ff8800"`)
    expect(out).toContain(`radius={220}`)
  })

  it('sanitizes an unsafe name into the effect prop', () => {
    const out = labSource('app', { ...DEFAULT_CONFIG, name: 'my fire!' })
    expect(out).toContain(`effect="myfire"`)
  })
})
