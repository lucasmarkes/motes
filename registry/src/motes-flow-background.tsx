'use client'

import { MotesBackground } from '@/components/motes-background'

/** Warm drifting noise. The cursor lights a core and drags a wake behind it. */
export function MotesFlowBackground() {
  return (
    <MotesBackground
      effect="flow"
      pointer
      radius={150}
      force={1.4}
      density={13}
      trail={0.3}
      accent="#d8531f"
    />
  )
}
