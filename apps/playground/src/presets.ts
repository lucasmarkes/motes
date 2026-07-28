import type { MotesOptions } from '@lucasmarkes/motes'

/**
 * Five looks, chosen to argue rather than to decorate.
 *
 * Paper is the reason `ink` had to ship alongside `background`: on a light
 * page the old hardcoded warm grey was invisible, and no background control
 * on its own would have fixed that. Glass is the reason the pipeline went
 * premultiplied. The other three are just good.
 *
 * Playground data, deliberately not library API — presets in core would mean
 * a second source of truth for colour.
 */
export interface Preset {
  id: string
  label: string
  values: Pick<MotesOptions, 'background' | 'ink' | 'accent'>
}

export const PRESETS: readonly Preset[] = [
  { id: 'void', label: 'Void', values: { background: '#050403', ink: '#827865', accent: '#ddeafe' } },
  { id: 'terminal', label: 'Terminal', values: { background: '#020a04', ink: '#1f6b34', accent: '#7dffa8' } },
  { id: 'amber', label: 'Amber', values: { background: '#0a0500', ink: '#7a4a08', accent: '#ffb347' } },
  { id: 'paper', label: 'Paper', values: { background: '#f5f2ea', ink: '#8a8578', accent: '#1a1a1a' } },
  { id: 'glass', label: 'Glass', values: { background: 'transparent', ink: '#ffffff', accent: '#ddeafe' } },
]
