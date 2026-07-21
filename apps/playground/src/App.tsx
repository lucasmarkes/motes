import { DEFAULT_OPTIONS, listEffects } from 'motes'

/**
 * Phase 0 boot check. The real playground — index grid, effect pages, the
 * brutalist panel and the INTERACTION toggle — lands in Phase 4.
 */
export function App() {
  return (
    <div className="shell">
      <div className="plate">
        <p className="eyebrow">motes — phase 0</p>
        <h1 className="title">Scaffold up. Renderer pending.</h1>
        <p className="body">
          Workspace wired, packages building, playground booting. The WebGL2
          field lands in Phase 1.
        </p>
        <hr className="rule" />
        <div className="status">
          <span>EFFECTS</span>
          <span>{listEffects().join(' / ')}</span>
        </div>
        <div className="status">
          <span>POINTER</span>
          <span>{String(DEFAULT_OPTIONS.pointer)}</span>
        </div>
        <div className="status">
          <span>DENSITY</span>
          <span>{DEFAULT_OPTIONS.density}px</span>
        </div>
      </div>
    </div>
  )
}
