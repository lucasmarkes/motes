'use client'

import { MotesBackground } from '@/components/motes-background'

/** Dense radial rings with long persistence, for a slow breathing backdrop. */
export function MotesPulseBackground() {
  return (
    <MotesBackground
      effect="pulse"
      pointer
      radius={140}
      force={1.6}
      density={11}
      speed={0.6}
      trail={0.6}
      accent="#c8a24a"
    />
  )
}
