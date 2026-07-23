import { describe, expect, it } from 'vitest'
import { diagnose, type DiagnosticInput } from '../diagnostics'

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
