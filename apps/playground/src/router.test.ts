import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigate } from './router'

describe('navigate', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/flow')
  })

  it('carries the current search onto the new path', () => {
    window.history.replaceState({}, '', '/flow?density=14&trail=0.3')
    navigate('/waves')
    expect(window.location.pathname).toBe('/waves')
    expect(window.location.search).toBe('?density=14&trail=0.3')
  })

  it('navigates cleanly when there is nothing to carry', () => {
    navigate('/waves')
    expect(window.location.pathname).toBe('/waves')
    expect(window.location.search).toBe('')
  })

  it('still no-ops when the pathname is unchanged, whatever the search holds', () => {
    window.history.replaceState({}, '', '/flow?density=14')
    const push = vi.spyOn(window.history, 'pushState')
    navigate('/flow')
    expect(push).not.toHaveBeenCalled()
    expect(window.location.search).toBe('?density=14')
    push.mockRestore()
  })
})
