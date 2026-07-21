import { createRef, StrictMode } from 'react'
import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MotesConfig, MotesInstance } from 'motes'

/**
 * The core needs a real WebGL2 context, which jsdom has none of. Mock it and
 * assert what the wrapper actually promises: create once, diff prop changes
 * down to `set`, tear down on unmount.
 */
const created: Array<{
  canvas: HTMLCanvasElement
  config: MotesConfig
  instance: MotesInstance
  sets: MotesConfig[]
  started: number
  destroyed: number
}> = []

vi.mock('motes', async () => {
  const DEFAULT_OPTIONS = {
    effect: 'flow',
    pointer: true,
    radius: 150,
    force: 1.4,
    speed: 1,
    density: 13,
    charset: ' .:-=+*#%@',
    accent: '#d8531f',
    trail: 0.3,
  }
  return {
    DEFAULT_OPTIONS,
    createMotes(canvas: HTMLCanvasElement, config: MotesConfig = {}) {
      const record = {
        canvas,
        config,
        sets: [] as MotesConfig[],
        started: 0,
        destroyed: 0,
        instance: null as unknown as MotesInstance,
      }
      const instance: MotesInstance = {
        start: () => { record.started++ },
        stop: () => {},
        set: (patch: MotesConfig) => { record.sets.push(patch) },
        getOptions: () => ({ ...DEFAULT_OPTIONS, ...config }),
        destroy: () => { record.destroyed++ },
      }
      record.instance = instance
      created.push(record)
      return instance
    },
  }
})

const { Motes } = await import('./index')

const latest = () => created[created.length - 1]!

beforeEach(() => {
  created.length = 0
})
afterEach(() => {
  cleanup()
})

describe('lifecycle', () => {
  it('creates one instance, starts it, and destroys it on unmount', () => {
    const view = render(<Motes effect="flow" />)
    expect(created).toHaveLength(1)
    expect(latest().started).toBe(1)
    expect(latest().destroyed).toBe(0)

    view.unmount()
    expect(latest().destroyed).toBe(1)
  })

  it('passes initial props into createMotes rather than through set()', () => {
    render(<Motes effect="waves" radius={220} accent="#00ff00" />)
    expect(latest().config).toMatchObject({
      effect: 'waves',
      radius: 220,
      accent: '#00ff00',
    })
    expect(latest().sets).toHaveLength(0)
  })

  it('survives a StrictMode double-mount, leaving one live instance', () => {
    render(
      <StrictMode>
        <Motes effect="flow" />
      </StrictMode>,
    )
    // React mounts, unmounts, remounts. Every instance but the last is torn down.
    const live = created.filter((c) => c.destroyed === 0)
    expect(live).toHaveLength(1)
    expect(live[0]!.started).toBe(1)
  })

  it('renders a canvas and forwards unknown props to it', () => {
    const { container } = render(
      <Motes effect="flow" className="fixed inset-0" aria-label="field" id="bg" />,
    )
    const canvas = container.querySelector('canvas')!
    expect(canvas).toBeTruthy()
    expect(canvas.className).toBe('fixed inset-0')
    expect(canvas.getAttribute('aria-label')).toBe('field')
    expect(canvas.id).toBe('bg')
    // display:block by default, so the canvas has no inline-baseline gap.
    expect(canvas.style.display).toBe('block')
  })

  it('lets caller styles win over the default display', () => {
    const { container } = render(
      <Motes style={{ display: 'flex', opacity: 0.5 }} />,
    )
    const canvas = container.querySelector('canvas')!
    expect(canvas.style.display).toBe('flex')
    expect(canvas.style.opacity).toBe('0.5')
  })
})

describe('prop diffing', () => {
  it('sends only the keys that changed', () => {
    const view = render(<Motes effect="flow" radius={150} force={1.4} />)
    expect(latest().sets).toHaveLength(0)

    view.rerender(<Motes effect="flow" radius={200} force={1.4} />)
    expect(latest().sets).toEqual([{ radius: 200 }])

    view.rerender(<Motes effect="waves" radius={200} force={1.4} />)
    expect(latest().sets).toEqual([{ radius: 200 }, { effect: 'waves' }])
  })

  it('stays silent when a re-render changes nothing', () => {
    const view = render(<Motes effect="flow" radius={150} />)
    view.rerender(<Motes effect="flow" radius={150} />)
    view.rerender(<Motes effect="flow" radius={150} />)
    expect(latest().sets).toHaveLength(0)
  })

  it('does not re-create the instance when props change', () => {
    const view = render(<Motes effect="flow" radius={150} />)
    view.rerender(<Motes effect="pulse" radius={300} density={9} />)
    expect(created).toHaveLength(1)
    expect(latest().destroyed).toBe(0)
  })

  it('ignores changes to non-option props', () => {
    const view = render(<Motes effect="flow" className="a" />)
    view.rerender(<Motes effect="flow" className="b" />)
    expect(latest().sets).toHaveLength(0)
  })

  it('propagates a prop becoming undefined without inventing a value', () => {
    const view = render(<Motes effect="flow" radius={200} />)
    view.rerender(<Motes effect="flow" radius={undefined} />)
    // The wrapper reports the transition; core is what refuses to apply
    // undefined over a resolved value.
    expect(latest().sets).toEqual([{ radius: undefined }])
  })

  it('tracks multiple simultaneous changes in one patch', () => {
    const view = render(<Motes effect="flow" radius={150} trail={0.3} />)
    view.rerender(<Motes effect="pulse" radius={90} trail={0.9} />)
    expect(latest().sets).toEqual([
      { effect: 'pulse', radius: 90, trail: 0.9 },
    ])
  })
})

describe('ref', () => {
  it('exposes a handle that is never null once mounted', () => {
    const ref = createRef<MotesInstance>()
    render(<Motes ref={ref} effect="flow" />)
    expect(ref.current).not.toBeNull()
    expect(typeof ref.current!.start).toBe('function')
  })

  it('delegates calls through to the live instance', () => {
    const ref = createRef<MotesInstance>()
    render(<Motes ref={ref} effect="flow" />)

    ref.current!.set({ force: 3 })
    expect(latest().sets).toEqual([{ force: 3 }])

    ref.current!.start()
    expect(latest().started).toBe(2) // once on mount, once here
  })

  it('keeps the diff baseline honest after an imperative set', () => {
    const ref = createRef<MotesInstance>()
    const view = render(<Motes ref={ref} effect="flow" radius={150} />)

    ref.current!.set({ radius: 400 })
    expect(latest().sets).toEqual([{ radius: 400 }])

    // Re-rendering with the original prop must push it back, not assume
    // the instance still holds 150.
    view.rerender(<Motes ref={ref} effect="flow" radius={150} />)
    expect(latest().sets).toEqual([{ radius: 400 }, { radius: 150 }])
  })
})
