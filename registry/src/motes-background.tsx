'use client'

import { Motes, type MotesProps } from '@motes/react'

export type MotesBackgroundProps = MotesProps

/**
 * A full-viewport ASCII field pinned behind your content.
 *
 * The canvas never swallows a click, and the field still reacts as the cursor
 * crosses whatever is stacked on top of it — motes reads the pointer from the
 * window and hit-tests the canvas box.
 *
 * Pass `pointer={false}` for an ambient field that ignores the cursor.
 */
export function MotesBackground({
  className,
  style,
  ...props
}: MotesBackgroundProps) {
  return (
    <Motes
      aria-hidden="true"
      {...props}
      className={['fixed inset-0 -z-10 h-full w-full', className]
        .filter(Boolean)
        .join(' ')}
      style={{ pointerEvents: 'none', ...style }}
    />
  )
}
