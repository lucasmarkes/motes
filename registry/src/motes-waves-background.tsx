'use client'

import { MotesBackground } from '@/components/motes-background'

/** Wide interfering sine bands, slowed down and cooled off. */
export function MotesWavesBackground() {
  return (
    <MotesBackground
      effect="waves"
      pointer
      radius={190}
      force={1.2}
      density={15}
      speed={0.7}
      trail={0.45}
      accent="#3f8ea7"
    />
  )
}
