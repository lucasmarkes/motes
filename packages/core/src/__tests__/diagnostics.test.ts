import { describe, expect, it } from 'vitest'
import { diagnose, diagnoseContrast, type DiagnosticInput } from '../diagnostics'

/**
 * A correctly-installed field: the documented React snippet
 * (`fixed inset-0 -z-10 h-full w-full`) once CSS has actually sized it, on an
 * ordinary page with transparent html/body. This is the gating case — it must
 * diagnose to null, or the diagnostic is worse than the bug it patches.
 */
const HEALTHY: DiagnosticInput = {
  clientWidth: 1280,
  clientHeight: 800,
  position: 'fixed',
  left: '0px',
  right: '0px',
  top: '0px',
  bottom: '0px',
  zIndex: '-10',
  containerWidth: 1280,
  containerHeight: 800,
  htmlBg: 'rgba(0, 0, 0, 0)',
  bodyBg: 'rgba(0, 0, 0, 0)',
  quiet: false,
}

const input = (over: Partial<DiagnosticInput>): DiagnosticInput => ({
  ...HEALTHY,
  ...over,
})

describe('diagnose', () => {
  it('passes a healthy field — the documented snippet, correctly sized', () => {
    expect(diagnose(HEALTHY)).toBeNull()
  })

  describe('Mode A — unsized (300×150 intrinsic)', () => {
    const UNSIZED = input({
      clientWidth: 300,
      clientHeight: 150,
      position: 'fixed',
      left: '0px',
      right: '0px',
      containerWidth: 1280,
      containerHeight: 800,
    })

    it('fires on the full over-constrained fingerprint', () => {
      const d = diagnose(UNSIZED)
      expect(d?.code).toBe('unsized')
      expect(d?.message).toContain('300×150')
    })

    it('also fires when position is absolute', () => {
      expect(diagnose(input({ ...UNSIZED, position: 'absolute' }))?.code).toBe('unsized')
    })

    it('ignores a deliberately static 300×150 canvas', () => {
      expect(diagnose(input({ ...UNSIZED, position: 'static' }))).toBeNull()
    })

    it('ignores a pinned 300×150 with right: auto (not over-constrained)', () => {
      expect(diagnose(input({ ...UNSIZED, right: 'auto' }))).toBeNull()
    })

    it('ignores a pinned 300×150 with left: auto', () => {
      expect(diagnose(input({ ...UNSIZED, left: 'auto' }))).toBeNull()
    })

    it('ignores 300×150 inside a 300×150 container (deliberate, box fits)', () => {
      expect(
        diagnose(input({ ...UNSIZED, containerWidth: 300, containerHeight: 150 })),
      ).toBeNull()
    })

    it('does not fire on a correctly sized field that merely is not 300×150', () => {
      expect(diagnose(input({ clientWidth: 640, clientHeight: 480 }))).toBeNull()
    })
  })

  describe('Mode B — occluded (negative z behind opaque html+body)', () => {
    const OCCLUDED = input({
      zIndex: '-10',
      htmlBg: 'rgb(10, 10, 10)',
      bodyBg: 'rgb(20, 20, 20)',
    })

    it('fires when z is negative and both html and body are opaque', () => {
      const d = diagnose(OCCLUDED)
      expect(d?.code).toBe('occluded')
      expect(d?.message).toContain('opaque')
    })

    it('ignores body-only opaque (background still propagates to viewport)', () => {
      expect(diagnose(input({ ...OCCLUDED, htmlBg: 'rgba(0, 0, 0, 0)' }))).toBeNull()
    })

    it('ignores html-only opaque', () => {
      expect(diagnose(input({ ...OCCLUDED, bodyBg: 'rgba(0, 0, 0, 0)' }))).toBeNull()
    })

    it('ignores both opaque when z-index is not negative', () => {
      expect(diagnose(input({ ...OCCLUDED, zIndex: 'auto' }))).toBeNull()
      expect(diagnose(input({ ...OCCLUDED, zIndex: '0' }))).toBeNull()
      expect(diagnose(input({ ...OCCLUDED, zIndex: '10' }))).toBeNull()
    })

    it('treats a zero-alpha rgba as transparent', () => {
      expect(
        diagnose(input({ ...OCCLUDED, bodyBg: 'rgba(20, 20, 20, 0)' })),
      ).toBeNull()
    })
  })

  describe('data-motes-quiet escape hatch', () => {
    it('silences Mode A', () => {
      expect(
        diagnose(
          input({
            clientWidth: 300,
            clientHeight: 150,
            containerWidth: 1280,
            containerHeight: 800,
            quiet: true,
          }),
        ),
      ).toBeNull()
    })

    it('silences Mode B', () => {
      expect(
        diagnose(
          input({ htmlBg: 'rgb(10, 10, 10)', bodyBg: 'rgb(20, 20, 20)', quiet: true }),
        ),
      ).toBeNull()
    })
  })
})

describe('diagnoseContrast', () => {
  const INK = [130 / 255, 120 / 255, 101 / 255] as [number, number, number]
  const DARK = [5 / 255, 4 / 255, 3 / 255, 1] as [number, number, number, number]

  it('passes the shipped default', () => {
    expect(diagnoseContrast(DARK, INK, false)).toBeNull()
  })

  it('warns when ink is invisible against the background', () => {
    const result = diagnoseContrast([1, 1, 1, 1], [1, 1, 1], false)
    expect(result?.code).toBe('washed')
    expect(result?.message).toMatch(/background/)
    expect(result?.message).toMatch(/data-motes-quiet/)
  })

  it('skips the check when the background is not opaque', () => {
    expect(diagnoseContrast([0, 0, 0, 0], [0, 0, 0], false)).toBeNull()
    expect(diagnoseContrast([0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5], false)).toBeNull()
  })

  it('is silenced by the quiet flag', () => {
    expect(diagnoseContrast([1, 1, 1, 1], [1, 1, 1], true)).toBeNull()
  })

  /** A deliberately subtle field must not be nagged at. */
  it('allows a low but legible ratio', () => {
    // mid grey on near-black is roughly 4:1 — well clear of the 1.5 floor.
    expect(diagnoseContrast(DARK, [0.5, 0.5, 0.5], false)).toBeNull()
  })

  it('pins the 1.5 floor from both sides', () => {
    // Grey ink on pure black: 0.17 measures ~1.490:1 (just under the floor),
    // 0.18 measures ~1.544:1 (just over). Numeric, not symbolic, so a change
    // to MIN_RATIO or the luminance formula can't drift without failing here.
    expect(diagnoseContrast([0, 0, 0, 1], [0.17, 0.17, 0.17], false)?.code).toBe('washed')
    expect(diagnoseContrast([0, 0, 0, 1], [0.18, 0.18, 0.18], false)).toBeNull()
  })
})
